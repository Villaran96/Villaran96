import type { Caption } from "@remotion/captions";
import { Video } from "@remotion/media";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Composition,
  staticFile,
} from "remotion";
import { Captions, defaultCaptionStyle } from "./Captions";

const FPS = 30;

export type CaptionedVideoProps = {
  /** Fichero dentro de public/. Sus subtítulos se buscan en public/<mismo nombre>.captions.json */
  videoSrc: string;
  /** Se rellena solo en calculateMetadata a partir del .captions.json; no hace falta tocarlo. */
  captions: Caption[];
  combineTokensWithinMilliseconds: number;
  fontSize: number;
  bottom: number;
  textColor: string;
  highlightColor: string;
};

const captionsFileFor = (videoSrc: string) =>
  `${videoSrc.replace(/\.[^./]+$/, "")}.captions.json`;

const getVideoDuration = async (src: string) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src),
  });
  return input.computeDuration();
};

const calculateMetadata: CalculateMetadataFunction<
  CaptionedVideoProps
> = async ({ props }) => {
  let durationInSeconds: number;
  try {
    durationInSeconds = await getVideoDuration(staticFile(props.videoSrc));
  } catch (error) {
    throw new Error(
      `No se pudo leer public/${props.videoSrc}. ¿Está el vídeo en la carpeta public/? (${error})`,
    );
  }

  // Sin .captions.json el vídeo se ve igualmente, solo que sin subtítulos.
  let captions: Caption[] = [];
  const response = await fetch(staticFile(captionsFileFor(props.videoSrc)));
  if (response.ok) {
    captions = (await response.json()) as Caption[];
  } else {
    console.warn(
      `Sin subtítulos: no existe public/${captionsFileFor(props.videoSrc)}. Genéralos con scripts/transcribe.sh`,
    );
  }

  return {
    durationInFrames: Math.max(1, Math.ceil(durationInSeconds * FPS)),
    props: { ...props, captions },
  };
};

export const CaptionedVideoComponent: React.FC<CaptionedVideoProps> = ({
  videoSrc,
  captions,
  ...captionStyle
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={staticFile(videoSrc)}
        objectFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      <Captions captions={captions} {...captionStyle} />
    </AbsoluteFill>
  );
};

export const CaptionedVideo = () => {
  return (
    <Composition
      id="CaptionedVideo"
      component={CaptionedVideoComponent}
      durationInFrames={150}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{
        videoSrc: "video.mp4",
        captions: [],
        ...defaultCaptionStyle,
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
