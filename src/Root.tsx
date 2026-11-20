import React from 'react';
import {Composition} from 'remotion';
import {
  HowItWorks,
  totalFramesFor as howItWorksFrames,
} from './series/how-it-works';
import {Cinematic, totalFramesFor as cinematicFrames} from './series/cinematic';
import {Thumbnail, THUMBNAIL_TOPICS, THUMBNAIL_VARIANTS} from './Thumbnail';
import {CANVAS} from './theme/tokens';
import {ensureFonts} from './theme/fonts';
import type {Script, Series, Timing} from './lib/schema';
import engineScript from '../videos/how-a-car-engine-works/script.json';
import premiumScript from '../videos/premium-vs-regular-gas/script.json';
import dieselScript from '../videos/diesel-in-a-gas-car/script.json';
import dieselProofScript from '../videos/diesel-choreo-proof/script.json';

// One series builder per `series` value (Spec §7). Each takes {script, timing}
// and exposes a matching total-frame estimator for the composition length.
const BUILDERS: Record<
  Series,
  {
    component: React.FC<{script: Script; timing: Timing | null}>;
    frames: (s: Script, t: Timing | null, fps: number) => number;
  }
> = {
  'how-it-works': {component: HowItWorks, frames: howItWorksFrames},
  versus: {component: Cinematic, frames: cinematicFrames},
  'what-happens-if': {component: Cinematic, frames: cinematicFrames},
  // Remaining series share the generic builders until their own land.
  'every-x': {component: HowItWorks, frames: howItWorksFrames},
  'why-does-my-car': {component: Cinematic, frames: cinematicFrames},
};

// Every videos/*/script.json registered here becomes a Composition whose id is
// its slug; CI's render workflow renders by that slug. Timing comes from
// inputProps (CI passes videos/<slug>/.cache/props.json produced by tts.py);
// Studio falls back to estimated timing so previews still render.
const SCRIPTS: Script[] = [
  engineScript as unknown as Script,
  premiumScript as unknown as Script,
  dieselScript as unknown as Script,
  dieselProofScript as unknown as Script,
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {SCRIPTS.map((script) => {
        const builder = BUILDERS[script.series];
        const Comp = builder.component;
        return (
          <Composition
            key={script.slug}
            id={script.slug}
            component={Comp}
            width={CANVAS.width}
            height={CANVAS.height}
            fps={CANVAS.fps}
            durationInFrames={builder.frames(script, null, CANVAS.fps)}
            defaultProps={{script, timing: null as Timing | null}}
            calculateMetadata={async ({
              props,
            }: {
              props: {script: Script; timing: Timing | null};
            }) => {
              await ensureFonts();
              const fps = CANVAS.fps;
              return {
                fps,
                width: CANVAS.width,
                height: CANVAS.height,
                durationInFrames: builder.frames(props.script, props.timing, fps),
              };
            }}
          />
        );
      })}

      {/* Per-topic clickbait thumbnails (id: thumb-<slug>-<variant>), rendered
          as stills by CI into the YouTube kit. */}
      {THUMBNAIL_TOPICS.flatMap((topic) =>
        THUMBNAIL_VARIANTS.map((v) => (
          <Composition
            key={`thumb-${topic}-${v}`}
            id={`thumb-${topic}-${v}`}
            component={Thumbnail}
            width={1280}
            height={720}
            fps={30}
            durationInFrames={1}
            defaultProps={{topic, variant: v}}
            calculateMetadata={async () => {
              await ensureFonts();
              return {};
            }}
          />
        ))
      )}
    </>
  );
};
