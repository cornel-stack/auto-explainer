# Manim segments

Precise, animated math/diagram moments (the octane number line, the knock
pressure trace) rendered with [Manim CE](https://www.manim.community/).

- Scenes live in `scenes.py`.
- CI renders them with a **transparent background** to `public/manim/<Scene>.webm`
  and commits them (see `.github/workflows/manim.yml`, run via *workflow_dispatch*).
- They are composited onto the cinematic stage by the `Clip` component, e.g.
  `{"component": "Clip", "props": {"src": "manim/OctaneScale.webm"}}` in a scene.

Kept out of the render path until the webm files exist, so a render never depends
on an un-run manim job. Render manim first, then reference the clips in a script.
