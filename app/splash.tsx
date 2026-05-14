import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { JSX, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View
} from 'react-native';

const { height } = Dimensions.get('window');

const CIRCLE_SIZE = 200;
const HALF_CIRCLE_SIZE = CIRCLE_SIZE / 2; // 100

// Define Gradient Colors
const GRADIENT_START = '#00C4CC';
const BLUE_PRIMARY = '#438c8cff';
const GRADIENT_END = '#008080';

// Define the color for text inside the white/blurred circle
const DARK_BLUE_TEXT = '#0c5c57ff'; // Dark blue text for readability

const CENTER_TO_BOTTOM_DISTANCE = (height / 2) - HALF_CIRCLE_SIZE; 

const SUBTITLE_WORDS = ['Your', 'Home,', 'Your', 'Commands']; 

// Create an animatable BlurView component
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function SplashScreen(): JSX.Element {
  const INITIAL_OFFSET = -height; 
  const bounceAnim = useRef(new Animated.Value(INITIAL_OFFSET)).current; 
  
  const subtitleOpacities = useRef(SUBTITLE_WORDS.map(() => new Animated.Value(0))).current;
  const letterOpacities = useRef(['V', 'I', 'S', 'T', 'A'].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // 1. Define the Reveal Sequence (Text/Subtitle)
    const startRevealSequence = (): Animated.CompositeAnimation => {
        return Animated.sequence([
            // Step 1: Reveal 'VISTA' Letter-by-Letter
            Animated.stagger(150, 
                letterOpacities.map(anim => 
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 150, 
                        easing: Easing.ease,
                        useNativeDriver: true,
                    })
                )
            ),
            
            // Step 2: Fade In Subtitle Word-by-Word
            Animated.stagger(250, 
                subtitleOpacities.map(anim => 
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 300, 
                        easing: Easing.ease,
                        useNativeDriver: true,
                    })
                )
            ),

            Animated.delay(1000), 
        ]);
    };

    // 2. Define the Drop and Bounce Animation
    const startDropBounce = (): void => {
        Animated.spring(bounceAnim, {
            toValue: 0, // Final settle point is the center offset
            friction: 5, 
            tension: 50, 
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                // 3. Start the text reveal immediately after the bounce settles
                startRevealSequence().start(() => {
                    router.replace('/auth');
                });
            }
        });
    };
    
    startDropBounce();
  }, [bounceAnim, subtitleOpacities]);

  const VISTA_LETTERS = ['V', 'I', 'S', 'T', 'A'];
  return (
    <LinearGradient
      colors={[GRADIENT_START, BLUE_PRIMARY, GRADIENT_END]}
      style={styles.container}
    >
      {/* Animated Soft Blur Circle */}
      <AnimatedBlurView 
        intensity={20} //
        tint="light"  
        style={[
          styles.circle,
          {
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        {/* VISTA Text Inside the Circle */}
        <View style={styles.vistaTextContainer}>
            {VISTA_LETTERS.map((letter, index) => (
                <Animated.Text
                    key={index}
                    style={[
                        styles.vistaLetter,
                        { opacity: letterOpacities[index] }
                    ]}
                >
                    {letter}
                </Animated.Text>
            ))}
        </View>
      </AnimatedBlurView>

      {/* Animated Subtitle Container */}
      <View style={styles.subtitleContainer}>
          {SUBTITLE_WORDS.map((word, index) => (
              <Animated.Text
                  key={index}
                  style={[
                      styles.subtitleWord, 
                      { opacity: subtitleOpacities[index] }
                  ]}
              >
                  {word}
                  {/* Add a space after each word except the last one */}
                  {index < SUBTITLE_WORDS.length - 1 ? ' ' : ''}
              </Animated.Text>
          ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: HALF_CIRCLE_SIZE,
    // 👈 Soft white transparency
    backgroundColor: 'rgba(255, 255, 255, 0.7)', 
    // Removed border and shadow properties
    overflow: 'hidden',                           
    
    position: 'absolute',
    top: '50%', 
    marginTop: -HALF_CIRCLE_SIZE, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  vistaTextContainer: {
    flexDirection: 'row', 
  },
  vistaLetter: {
    fontSize: 55,
    fontWeight: 'bold',
    // Dark blue text for visibility on the white circle
    color: DARK_BLUE_TEXT, 
  },
  subtitleContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    position: 'absolute',
    top: '50%', 
    marginTop: 120, 
  },
  subtitleWord: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.9)', 
  },
});