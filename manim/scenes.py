"""Manim animations for the auto-explainer channel.

Rendered in CI (``.github/workflows/manim.yml``) with a transparent background to
``public/manim/<Scene>.webm`` and composited onto the cinematic stage via the
``Clip`` component. Colours mirror src/theme/cinema.ts.

These are math/diagram moments where manim's precise, animated typography beats a
hand-drawn component — e.g. the octane number line and the knock pressure trace.
"""
from manim import *

INK = "#F4F7FD"
FUEL = "#3DA5FF"
PREMIUM = "#FFB020"
POWER = "#FF5A5F"
OK = "#2FE6A8"


class OctaneScale(Scene):
    """A 0–100 number line: heptane (0) to iso-octane (100), with 87 and 91."""

    def construct(self):
        line = NumberLine(
            x_range=[0, 100, 10],
            length=11,
            include_numbers=True,
            color=INK,
            decimal_number_config={"num_decimal_places": 0, "color": INK},
        )
        self.play(Create(line), run_time=1.2)

        hept = Dot(line.n2p(0), color=POWER, radius=0.14)
        iso = Dot(line.n2p(100), color=OK, radius=0.14)
        hept_lbl = Text("Heptane\nignites easily", font_size=26, color=POWER).next_to(hept, UP, buff=0.4)
        iso_lbl = Text("Iso-octane\nresists knock", font_size=26, color=OK).next_to(iso, UP, buff=0.4)
        self.play(FadeIn(hept, scale=0.5), Write(hept_lbl))
        self.play(FadeIn(iso, scale=0.5), Write(iso_lbl))
        self.wait(0.4)

        for val, col, name in [(87, FUEL, "87 · Regular"), (91, PREMIUM, "91 · Premium")]:
            d = Dot(line.n2p(0), color=col, radius=0.16)
            lbl = Text(name, font_size=28, color=col, weight=BOLD).next_to(line.n2p(val), DOWN, buff=0.5)
            self.add(d)
            self.play(d.animate.move_to(line.n2p(val)), FadeIn(lbl, shift=UP * 0.3), run_time=1.1)
        self.wait(1.0)


class KnockCurve(Scene):
    """Cylinder-pressure vs crank angle: a smooth spark burn vs a knock spike."""

    def construct(self):
        ax = Axes(
            x_range=[0, 1, 0.25],
            y_range=[0, 1, 0.25],
            x_length=10,
            y_length=5.2,
            axis_config={"color": INK, "include_ticks": False},
        )
        x_lbl = Text("Crank angle →", font_size=26, color=INK).next_to(ax.x_axis, DOWN, buff=0.3)
        y_lbl = Text("Cylinder pressure", font_size=26, color=INK).rotate(PI / 2).next_to(ax.y_axis, LEFT, buff=0.3)
        self.play(Create(ax), FadeIn(x_lbl), FadeIn(y_lbl))

        import math

        def smooth(x):
            return 0.12 + 0.55 * math.exp(-((x - 0.58) ** 2) / 0.02)

        def knock(x):
            base = 0.12 + 0.5 * math.exp(-((x - 0.58) ** 2) / 0.02)
            spike = 0.5 * math.exp(-((x - 0.55) ** 2) / 0.0006)
            return min(1.0, base + spike)

        good = ax.plot(smooth, x_range=[0, 1], color=OK)
        bad = ax.plot(knock, x_range=[0, 1], color=POWER)
        good_lbl = Text("Controlled burn", font_size=26, color=OK).next_to(ax.c2p(0.85, smooth(0.85)), UR, buff=0.1)
        bad_lbl = Text("Knock", font_size=26, color=POWER).next_to(ax.c2p(0.55, 1.0), UP, buff=0.1)

        self.play(Create(good), FadeIn(good_lbl), run_time=1.6)
        self.play(Create(bad), FadeIn(bad_lbl), run_time=1.6)
        self.wait(1.0)
