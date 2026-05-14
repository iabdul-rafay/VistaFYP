#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>           // NEW: For HTTP server
#include <ESPmDNS.h>             // NEW: For mDNS discovery (vista-iot.local)
#include <BluetoothSerial.h>     // NEW: For Bluetooth Serial fallback
#include <ArduinoJson.h>         // NEW: For JSON parsing/generation
#include <LiquidCrystal_I2C.h>

// WiFi Credentials
const char* WIFI_SSID = "Estuff";
const char* WIFI_PASSWORD = "@Rajput786";

// Firebase Configuration
const char* FIREBASE_HOST = "my-vista-iot-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH = "AxbRFGFUdEhC6jDhzGOFg3oVRI8ESKOaea4IRcSt";

// Pin Definitions
const int FAN1_PWM_PIN = 25;
const int FAN2_PWM_PIN = 26;
const int DOOR_SERVO_PIN = 27;
const int BULB1_PIN = 18;
const int BULB2_PIN = 19;
const int TV_PIN = 23;
const int SERIAL2_RX_PIN = 16;
const int SERIAL2_TX_PIN = 17;

// I2C LCD Configuration
const int LCD_I2C_ADDRESS = 0x27;
const int LCD_COLS = 16;
const int LCD_ROWS = 2;

const int DEFAULT_PWM_FREQ = 1000;
const int PWM_RESOLUTION = 10;

// NEW: HTTP Server and mDNS
WebServer server(8080);                    // HTTP server on port 8080
BluetoothSerial SerialBT;                  // Bluetooth Serial
const char* mDNS_NAME = "vista-iot";       // Hostname: vista-iot.local

// Servo, PWM and LCD objects
Servo doorServo;
ESP32PWM pwm1, pwm2;
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLS, LCD_ROWS);

// Device states
int fan1Speed = 0;
int fan2Speed = 0;
int servoAngle = 90;
bool bulb1State = false;
bool bulb2State = false;
bool tvState = false;

String displayMessage = "Vista IoT System";
String lastDisplayMessage = "";

const int DEVICE_ON = LOW;
const int DEVICE_OFF = HIGH;

// Firebase sync (ASYNC NOW - non-blocking)
unsigned long lastFirebaseSync = 0;
const unsigned long FIREBASE_SYNC_INTERVAL = 5000;  // Increased to 5 seconds (not critical path)
bool firebaseConnected = false;

// Display update timer
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_UPDATE_INTERVAL = 1000;
bool lcdInitialized = false;

// For scrolling long messages
int scrollPosition = 0;
unsigned long lastScrollTime = 0;
const unsigned long SCROLL_INTERVAL = 300;
bool isScrolling = false;

// Serial2 buffer
String serial2Buffer = "";
unsigned long lastSerial2Command = 0;
const unsigned long SERIAL2_TIMEOUT = 100;

// NEW: Command response tracking
struct CommandResponse {
  bool success;
  String message;
  JsonDocument deviceState;
};

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== VISTA IOT SYSTEM v2.0 (REFACTORED) ===");
    Serial.println("Features: Direct Commands + Async Firebase");
    
    // Initialize Serial2 for Bluetooth fallback
    Serial2.begin(9600, SERIAL_8N1, SERIAL2_RX_PIN, SERIAL2_TX_PIN);
    Serial.println("Serial2 initialized (legacy serial fallback)");
    
    // NEW: Initialize Bluetooth Serial
    if (!SerialBT.begin(mDNS_NAME)) {
        Serial.println("Bluetooth initialization failed!");
    } else {
        Serial.println("Bluetooth Serial initialized as '" + String(mDNS_NAME) + "'");
    }
    
    // Connect to WiFi
    connectWiFi();
    
    // Initialize hardware
    initHardware();
    
    // Initialize LCD
    initLCD();
    
    // NEW: Setup HTTP server
    setupWebServer();
    
    // NEW: Setup mDNS
    if (!MDNS.begin(mDNS_NAME)) {
        Serial.println("mDNS failed! Device will not be discoverable as vista-iot.local");
    } else {
        Serial.println("mDNS started!");
        Serial.println("Device discoverable as: http://" + String(mDNS_NAME) + ".local:8080");
        MDNS.addService("http", "tcp", 8080);
    }
    
    // Test Firebase (async, non-blocking)
    testFirebaseAsync();
    
    Serial.println("System Ready!");
    Serial.println("Commands via: HTTP POST /cmd (WiFi) or Serial2 (Bluetooth)");
    Serial.println("====================================\n");
}

void loop() {
    // Handle HTTP requests
    server.handleClient();
    
    // Handle USB Serial commands
    handleSerialCommands();
    
    // Handle Bluetooth Serial commands
    handleBluetoothCommands();
    
    // Handle legacy Serial2 commands
    handleSerial2Commands();
    
    // Update display with scrolling
    updateDisplayScrolling();
    
    // NEW: Async Firebase sync (non-blocking, only updates state)
    if (firebaseConnected && WiFi.status() == WL_CONNECTED) {
        if (millis() - lastFirebaseSync > FIREBASE_SYNC_INTERVAL) {
            syncFirebaseAsync();
            lastFirebaseSync = millis();
        }
    }
    
    delay(10);
}

/**
 * NEW: Setup HTTP Web Server for direct commands
 */
void setupWebServer() {
    // Handle root endpoint (info)
    server.on("/", HTTP_GET, []() {
        JsonDocument doc;
        doc["device"] = "Vista-IoT";
        doc["version"] = "2.0";
        doc["status"] = "ready";
        doc["wifi"] = WiFi.status() == WL_CONNECTED ? "connected" : "disconnected";
        doc["firebase"] = firebaseConnected ? "connected" : "offline";
        
        String response;
        serializeJson(doc, response);
        server.send(200, "application/json", response);
    });
    
    // Handle command endpoint - THIS IS THE MAIN COMMAND PATH
    server.on("/cmd", HTTP_POST, []() {
        String body = server.arg("plain");
        Serial.println("[HTTP] Command received: " + body);
        
        JsonDocument cmdDoc;
        DeserializationError error = deserializeJson(cmdDoc, body);
        
        if (error) {
            JsonDocument errDoc;
            errDoc["success"] = false;
            errDoc["error"] = "Invalid JSON";
            String response;
            serializeJson(errDoc, response);
            server.send(400, "application/json", response);
            return;
        }
        
        // Extract action from request
        String action = cmdDoc["action"] | "";
        CommandResponse response = executeCommand(action);
        
        String jsonResponse = serializeCommandResponse(response);
        server.send(200, "application/json", jsonResponse);
    });
    
    // Handle status endpoint
    server.on("/status", HTTP_GET, []() {
        JsonDocument doc;
        doc["fan1_speed"] = fan1Speed;
        doc["fan2_speed"] = fan2Speed;
        doc["servo_angle"] = servoAngle;
        doc["bulb1"] = bulb1State;
        doc["bulb2"] = bulb2State;
        doc["tv"] = tvState;
        doc["display_message"] = displayMessage;
        doc["wifi"] = WiFi.status() == WL_CONNECTED ? "connected" : "disconnected";
        doc["firebase"] = firebaseConnected ? "connected" : "offline";
        
        String response;
        serializeJson(doc, response);
        server.send(200, "application/json", response);
    });
    
    // Handle 404
    server.onNotFound([]() {
        server.send(404, "application/json", "{\"error\":\"endpoint not found\"}");
    });
    
    server.begin();
    Serial.println("HTTP Server started on port 8080");
}

/**
 * Convert a command response to the same JSON format for HTTP and Bluetooth.
 */
String serializeCommandResponse(CommandResponse response) {
    JsonDocument respDoc;
    respDoc["success"] = response.success;
    respDoc["message"] = response.message;
    respDoc["device_states"] = response.deviceState;

    String jsonResponse;
    serializeJson(respDoc, jsonResponse);
    return jsonResponse;
}

/**
 * NEW: Execute command and return device state
 * Returns immediately (no Firebase interaction)
 */
CommandResponse executeCommand(String action) {
    CommandResponse resp;
    resp.deviceState = JsonDocument();
    
    action.trim();
    action.toUpperCase();
    
    Serial.print("[CMD] Processing: ");
    Serial.println(action);

    // Status command for Bluetooth clients that need current state
    if (action == "STATUS") {
        resp.success = true;
        resp.message = "Device status";
    }
    // Fan1 command
    else if (action.startsWith("FAN1:")) {
        int speed = action.substring(5).toInt();
        setFan1Speed(speed);
        resp.success = true;
        resp.message = "Fan1 speed set to " + String(speed) + "%";
    }
    // Fan2 command
    else if (action.startsWith("FAN2:")) {
        int speed = action.substring(5).toInt();
        setFan2Speed(speed);
        resp.success = true;
        resp.message = "Fan2 speed set to " + String(speed) + "%";
    }
    // Servo command
    else if (action.startsWith("SERVO:")) {
        int angle = action.substring(6).toInt();
        setServoAngle(angle);
        resp.success = true;
        resp.message = "Servo angle set to " + String(angle) + "°";
    }
    // Bulb1 commands
    else if (action == "BULB1:ON") {
        setBulb1(true);
        resp.success = true;
        resp.message = "Bulb1 turned ON";
    }
    else if (action == "BULB1:OFF") {
        setBulb1(false);
        resp.success = true;
        resp.message = "Bulb1 turned OFF";
    }
    else if (action == "BULB1:TOGGLE") {
        setBulb1(!bulb1State);
        resp.success = true;
        resp.message = "Bulb1 toggled to " + String(bulb1State ? "ON" : "OFF");
    }
    // Bulb2 commands
    else if (action == "BULB2:ON") {
        setBulb2(true);
        resp.success = true;
        resp.message = "Bulb2 turned ON";
    }
    else if (action == "BULB2:OFF") {
        setBulb2(false);
        resp.success = true;
        resp.message = "Bulb2 turned OFF";
    }
    else if (action == "BULB2:TOGGLE") {
        setBulb2(!bulb2State);
        resp.success = true;
        resp.message = "Bulb2 toggled to " + String(bulb2State ? "ON" : "OFF");
    }
    // TV commands
    else if (action == "TV:ON") {
        setTV(true);
        resp.success = true;
        resp.message = "TV turned ON";
    }
    else if (action == "TV:OFF") {
        setTV(false);
        resp.success = true;
        resp.message = "TV turned OFF";
    }
    else if (action == "TV:TOGGLE") {
        setTV(!tvState);
        resp.success = true;
        resp.message = "TV toggled to " + String(tvState ? "ON" : "OFF");
    }
    // Display command
    else if (action.startsWith("LCD:")) {
        String message = action.substring(4);
        displayMessage = message;
        updateLCD();
        resp.success = true;
        resp.message = "Display message updated";
    }
    else {
        resp.success = false;
        resp.message = "Unknown command: " + action;
    }
    
    // Always include current device states in response
    resp.deviceState["fan1_speed"] = fan1Speed;
    resp.deviceState["fan2_speed"] = fan2Speed;
    resp.deviceState["servo_angle"] = servoAngle;
    resp.deviceState["bulb1"] = bulb1State;
    resp.deviceState["bulb2"] = bulb2State;
    resp.deviceState["tv"] = tvState;
    resp.deviceState["timestamp"] = millis();
    
    return resp;
}

/**
 * NEW: Async Firebase sync - only reads state, doesn't block commands
 */
void syncFirebaseAsync() {
    if (!firebaseConnected) return;
    
    Serial.println("[Firebase Async] Syncing state...");
    
    // Write current device states to Firebase
    writeDeviceStateToFirebase();
}

/**
 * Write device states to Firebase (async fire-and-forget)
 */
void writeDeviceStateToFirebase() {
    if (WiFi.status() != WL_CONNECTED) return;
    
    String updates = "{";
    updates += "\"vista_iot/fans/fan1_speed\":" + String(fan1Speed) + ",";
    updates += "\"vista_iot/fans/fan2_speed\":" + String(fan2Speed) + ",";
    updates += "\"vista_iot/servo/angle\":" + String(servoAngle) + ",";
    updates += "\"vista_iot/relays/bulb1\":" + String(bulb1State ? "true" : "false") + ",";
    updates += "\"vista_iot/relays/bulb2\":" + String(bulb2State ? "true" : "false") + ",";
    updates += "\"vista_iot/relays/tv\":" + String(tvState ? "true" : "false");
    updates += "}";
    
    String url = String("https://") + FIREBASE_HOST + String("/.json?auth=") + FIREBASE_AUTH;
    
    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.PATCH(updates);
    
    if (httpCode == HTTP_CODE_OK) {
        Serial.println("[Firebase] State synced successfully");
    } else {
        Serial.print("[Firebase] Sync failed: ");
        Serial.println(httpCode);
    }
    
    http.end();
}

/**
 * NEW: Async Firebase test (non-blocking)
 */
void testFirebaseAsync() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Firebase test skipped: No WiFi");
        displayMessage = "WiFi Offline";
        updateLCD();
        return;
    }
    
    String url = String("https://") + FIREBASE_HOST + String("/.json?auth=") + FIREBASE_AUTH;
    
    HTTPClient http;
    http.begin(url);
    http.setTimeout(3000);
    
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
        Serial.println("Firebase: Connected!");
        firebaseConnected = true;
        displayMessage = "System Ready";
    } else {
        Serial.print("Firebase: Connection failed (");
        Serial.print(httpCode);
        Serial.println(")");
        firebaseConnected = false;
        displayMessage = "Firebase Error";
    }
    
    http.end();
    updateLCD();
}

/**
 * Connect to WiFi
 */
void connectWiFi() {
    Serial.print("Connecting to WiFi '" + String(WIFI_SSID) + "'... ");
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi Connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        displayMessage = "WiFi Connected";
    } else {
        Serial.println("\nWiFi Failed! Will work offline.");
        displayMessage = "WiFi Failed";
    }
}

/**
 * Initialize hardware
 */
void initHardware() {
    Serial.println("Initializing hardware...");
    
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    
    pwm1.attachPin(FAN1_PWM_PIN, DEFAULT_PWM_FREQ, PWM_RESOLUTION);
    pwm2.attachPin(FAN2_PWM_PIN, DEFAULT_PWM_FREQ, PWM_RESOLUTION);
    
    doorServo.attach(DOOR_SERVO_PIN);
    
    pinMode(BULB1_PIN, OUTPUT);
    pinMode(BULB2_PIN, OUTPUT);
    pinMode(TV_PIN, OUTPUT);
    
    setFan1Speed(0);
    setFan2Speed(0);
    setServoAngle(90);
    digitalWrite(BULB1_PIN, DEVICE_OFF);
    digitalWrite(BULB2_PIN, DEVICE_OFF);
    digitalWrite(TV_PIN, DEVICE_OFF);
    
    Serial.println("Hardware initialized");
}

/**
 * Initialize LCD display
 */
void initLCD() {
    Serial.println("Initializing LCD...");
    
    Wire.begin(21, 22);
    
    byte error;
    Wire.beginTransmission(LCD_I2C_ADDRESS);
    error = Wire.endTransmission();
    
    if (error == 0) {
        Serial.print("LCD found at 0x");
        Serial.println(LCD_I2C_ADDRESS, HEX);
    } else {
        Serial.print("LCD not found at 0x");
        Serial.print(LCD_I2C_ADDRESS, HEX);
        Serial.println(", trying 0x3F...");
        
        lcd = LiquidCrystal_I2C(0x3F, LCD_COLS, LCD_ROWS);
        Wire.beginTransmission(0x3F);
        error = Wire.endTransmission();
        
        if (error != 0) {
            Serial.println("LCD not found! Check connections.");
            lcdInitialized = false;
            return;
        }
    }
    
    lcd.init();
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Vista IoT v2.0");
    lcd.setCursor(0, 1);
    lcd.print("Initializing...");
    
    lcdInitialized = true;
    Serial.println("LCD initialized");
}

/**
 * Update LCD display with current message
 */
void updateLCD() {
    if (!lcdInitialized) return;
    
    lcd.clear();
    
    if (displayMessage.length() <= LCD_COLS) {
        int startPos = (LCD_COLS - displayMessage.length()) / 2;
        lcd.setCursor(startPos, 0);
        lcd.print(displayMessage);
        lcd.setCursor(0, 1);
        
        String statusLine = "F1:" + String(fan1Speed) + "% ";
        statusLine += "B1:";
        statusLine += (bulb1State ? "ON" : "OFF");
        
        lcd.print(statusLine);
    } else {
        isScrolling = true;
        scrollPosition = 0;
        updateDisplayScrolling();
    }
}

/**
 * Update display with scrolling for long messages
 */
void updateDisplayScrolling() {
    if (!lcdInitialized || !isScrolling) return;
    
    if (millis() - lastScrollTime > SCROLL_INTERVAL) {
        lcd.clear();
        
        int messageLength = displayMessage.length();
        String displayText;
        
        if (scrollPosition + LCD_COLS <= messageLength) {
            displayText = displayMessage.substring(scrollPosition, scrollPosition + LCD_COLS);
        } else {
            int remaining = messageLength - scrollPosition;
            displayText = displayMessage.substring(scrollPosition);
            displayText += displayMessage.substring(0, LCD_COLS - remaining);
        }
        
        lcd.setCursor(0, 0);
        lcd.print(displayText);
        
        String statusLine = "F1:" + String(fan1Speed) + "% ";
        statusLine += "B1:";
        statusLine += (bulb1State ? "ON" : "OFF");
        
        lcd.setCursor(0, 1);
        lcd.print(statusLine);
        
        scrollPosition++;
        if (scrollPosition >= messageLength) {
            scrollPosition = 0;
        }
        
        lastScrollTime = millis();
    }
}

/**
 * Show custom message on LCD temporarily
 */
void showCustomMessage(String message, int duration = 3000) {
    if (!lcdInitialized) return;
    
    String originalMessage = displayMessage;
    bool wasScrolling = isScrolling;
    
    displayMessage = message;
    isScrolling = message.length() > LCD_COLS;
    
    lcd.clear();
    
    if (message.length() <= LCD_COLS) {
        int startPos = (LCD_COLS - message.length()) / 2;
        lcd.setCursor(startPos, 0);
        lcd.print(message);
    } else {
        lcd.setCursor(0, 0);
        lcd.print(message.substring(0, LCD_COLS));
    }
    
    lcd.setCursor(0, 1);
    lcd.print("<< Temp Msg >>");
    
    delay(duration);
    
    displayMessage = originalMessage;
    isScrolling = wasScrolling;
    updateLCD();
}

/**
 * Set Fan 1 speed (0-100%)
 */
void setFan1Speed(int speed) {
    speed = constrain(speed, 0, 100);
    fan1Speed = speed;
    
    float duty = speed / 100.0;
    if (speed > 0 && duty < 0.2) duty = 0.2;
    if (duty > 0.95) duty = 0.95;
    
    pwm1.writeScaled(duty);
    Serial.print("[Fan1] Speed: ");
    Serial.print(speed);
    Serial.println("%");
}

/**
 * Set Fan 2 speed (0-100%)
 */
void setFan2Speed(int speed) {
    speed = constrain(speed, 0, 100);
    fan2Speed = speed;
    
    float duty = speed / 100.0;
    if (speed > 0 && duty < 0.2) duty = 0.2;
    if (duty > 0.95) duty = 0.95;
    
    pwm2.writeScaled(duty);
    Serial.print("[Fan2] Speed: ");
    Serial.print(speed);
    Serial.println("%");
}

/**
 * Set servo angle (0-180)
 */
void setServoAngle(int angle) {
    angle = constrain(angle, 0, 180);
    servoAngle = angle;
    
    doorServo.write(angle);
    Serial.print("[Servo] Angle: ");
    Serial.print(angle);
    Serial.println("°");
    
    if (lcdInitialized) {
        showCustomMessage("Door: " + String(angle) + "°", 2000);
    }
}

/**
 * Set Bulb 1 state
 */
void setBulb1(bool state) {
    bulb1State = state;
    digitalWrite(BULB1_PIN, state ? DEVICE_ON : DEVICE_OFF);
    Serial.print("[Bulb1] ");
    Serial.println(state ? "ON" : "OFF");
}

/**
 * Set Bulb 2 state
 */
void setBulb2(bool state) {
    bulb2State = state;
    digitalWrite(BULB2_PIN, state ? DEVICE_ON : DEVICE_OFF);
    Serial.print("[Bulb2] ");
    Serial.println(state ? "ON" : "OFF");
}

/**
 * Set TV state
 */
void setTV(bool state) {
    tvState = state;
    digitalWrite(TV_PIN, state ? DEVICE_ON : DEVICE_OFF);
    Serial.print("[TV] ");
    Serial.println(state ? "ON" : "OFF");
    
    if (lcdInitialized) {
        String msg = "TV: ";
        msg += (state ? "ON" : "OFF");
        showCustomMessage(msg, 2000);
    }
}

/**
 * Handle USB Serial commands
 */
void handleSerialCommands() {
    if (Serial.available() > 0) {
        String input = Serial.readStringUntil('\n');
        input.trim();
        
        if (input.length() > 0) {
            Serial.print("[Serial] ");
            
            // Process as command
            CommandResponse resp = executeCommand(input);
            Serial.println(resp.message);
            
            // Async write to Firebase (non-blocking)
            syncFirebaseAsync();
        }
    }
}

/**
 * NEW: Handle Bluetooth Serial commands
 */
void handleBluetoothCommands() {
    if (SerialBT.available() > 0) {
        char c = SerialBT.read();
        
        // Check for timeout
        if (millis() - lastSerial2Command > SERIAL2_TIMEOUT) {
            serial2Buffer = "";
        }
        
        if (c == '\n' || c == '\r') {
            if (serial2Buffer.length() > 0) {
                CommandResponse resp = executeCommand(serial2Buffer);
                SerialBT.println(serializeCommandResponse(resp));
                
                // Also log to USB
                Serial.print("[Bluetooth] ");
                Serial.println(resp.message);
                
                // Async write to Firebase
                syncFirebaseAsync();
                
                serial2Buffer = "";
            }
        } else {
            serial2Buffer += c;
        }
        
        lastSerial2Command = millis();
    }
}

/**
 * Handle legacy Serial2 commands
 */
void handleSerial2Commands() {
    // Legacy support - same as Bluetooth
    if (Serial2.available() > 0) {
        char c = Serial2.read();
        
        if (millis() - lastSerial2Command > SERIAL2_TIMEOUT) {
            serial2Buffer = "";
        }
        
        if (c == '\n' || c == '\r') {
            if (serial2Buffer.length() > 0) {
                CommandResponse resp = executeCommand(serial2Buffer);
                Serial2.println(serializeCommandResponse(resp));
                
                // Also sync to Firebase
                syncFirebaseAsync();
                
                serial2Buffer = "";
            }
        } else {
            serial2Buffer += c;
        }
        
        lastSerial2Command = millis();
    }
}
