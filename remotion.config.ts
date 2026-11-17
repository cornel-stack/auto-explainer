import {Config} from '@remotion/cli/config';

// Fixed decisions (Technical Spec §3, §10): 1920x1080, H.264 High, yuv420p, CRF 18.
Config.setVideoImageFormat('jpeg');
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('angle');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
Config.overrideWebpackConfig((config) => config);
