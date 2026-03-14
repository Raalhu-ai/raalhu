import React from "react";
import { createRoot } from "react-dom/client";
import { AppRegistry } from "react-native-web";
import "../global.css";
import App from "./App";

AppRegistry.registerComponent("raalhu-options", () => App);
const { element } = AppRegistry.getApplication("raalhu-options");

createRoot(document.getElementById("root")!).render(element);
