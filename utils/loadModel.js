import { Asset } from "expo-asset";
import { loadTensorflowModel } from "react-native-fast-tflite";

export const loadModel = async () => {
  try {
    const asset = Asset.fromModule(
      require("../assets/models/gesture_model.tflite"),
    );

    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error("Model file not found or not loaded");
    }

    const model = await loadTensorflowModel(
      require("../assets/models/gesture_model.tflite"),
      [],
    );

    console.log("Model loaded successfully ✔");
    console.log("Model inputs:", model.inputs);
    console.log("Model outputs:", model.outputs);

    return model;
  } catch (error) {
    console.log("Model loading error:", error);
    return null;
  }
};
