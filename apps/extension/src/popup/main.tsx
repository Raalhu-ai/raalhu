import React from "react";
import { createRoot } from "react-dom/client";
import { AppRegistry } from "react-native-web";
import "../global.css";
import App from "./App";

AppRegistry.registerComponent("raalhu-popup", () => App);
const { element } = AppRegistry.getApplication("raalhu-popup");

createRoot(document.getElementById("root")!).render(element);
