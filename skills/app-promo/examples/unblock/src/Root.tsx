// Root.tsx — app-promo
import { Composition, Folder } from "remotion";
import { T, UnblockPromo } from "./unblock/UnblockPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Unblock">
      <Composition id="UnblockPromo" component={UnblockPromo} durationInFrames={T.end} fps={60} width={1080} height={1920} />
    </Folder>
  );
};
