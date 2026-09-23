import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Color estándar de video (bt709, rango de TV): sin esto el render sale en rango completo con
// matriz bt470bg, y algunas apps muestran los colores lavados o pasados.
Config.setColorSpace("bt709");
