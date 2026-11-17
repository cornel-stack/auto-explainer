import React from 'react';
import {Composition} from 'remotion';
import {HowItWorks, totalFramesFor, type HowItWorksProps} from './series/how-it-works';
import {CANVAS} from './theme/tokens';
import {ensureFonts} from './theme/fonts';
import type {Script, Timing} from './lib/schema';
import engineScript from '../videos/how-a-car-engine-works/script.json';

const script = engineScript as unknown as Script;

// Compositions are registered from videos/*/script.json. Timing comes from
// inputProps (CI passes videos/<slug>/.cache/props.json produced by tts.py);
// Studio falls back to an estimated timing so previews still render.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={script.slug}
        component={HowItWorks}
        width={CANVAS.width}
        height={CANVAS.height}
        fps={CANVAS.fps}
        durationInFrames={totalFramesFor(script, null, CANVAS.fps)}
        defaultProps={{script, timing: null as Timing | null}}
        calculateMetadata={async ({props}: {props: HowItWorksProps}) => {
          await ensureFonts();
          const fps = CANVAS.fps;
          return {
            fps,
            width: CANVAS.width,
            height: CANVAS.height,
            durationInFrames: totalFramesFor(props.script, props.timing, fps),
          };
        }}
      />
    </>
  );
};
