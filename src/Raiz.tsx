import { Composition } from "remotion";
import { Prueba } from "./plantilla/Prueba";

/**
 * Acá se registran las composiciones. La de prueba viene incluida y confirma
 * que la instalación quedó bien; cada video nuevo agrega la suya.
 */
export const Raiz: React.FC = () => {
  return (
    <Composition
      id="Prueba"
      component={Prueba}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
