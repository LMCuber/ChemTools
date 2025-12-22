# LWV
_LMCuber's Werke Verzeichnis_ for the web, built with Vue.js.

Currently working projects:
* _Chemtools_: chemical structure visualiser
* _L-systems_: L-systems generator

## chemtools
(In)organic compound visualiser on the web.

* ChemTools sends a request to [PubChem](https://pubchem.ncbi.nlm.nih.gov/) & retrieves a SDF (Structural Data File).
* This file then gets parsed and converted into geometry, which in turn gets rendered by THREE.js.

The general response time is around 100ms for smaller molecules and under 500ms for larger compounds. Some large / unstable compounds don't inherenly support a 3D view, as the PubChem API briefly quotes:
> Conformer generation is disallowed since too many atoms, too flexible, too many undefined stereo centers

### Example output
Below are a few examples of the structures generated:

<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/chem_egfr.png" width="700" />
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/chem_cubane.png" width="700"/>

## L-systems
Interactive editor for [_Lindenmayer_ systems](https://en.wikipedia.org/wiki/L-system). An L-system describes a procedure where the rules of a formal language are applied onto itself in parallel.
To put simply, it generates a new output string given a starting value (an _axiom_), and rewrite rules. Below is an example of such a system:
* Axiom: `G`
* Rules:
    * `G` -> `F[+G]-G`
    * `F` -> `FF`

When applying rules, we get:
* `n = 0` : `G`
* `n = 1` : `F[+G]-G`
* `n = 2` : `FF[+F[+G]-G]-F[+G]-G`
* `n = 3` : `FFFF[+FF[+F[+G]-G]-F[+G]-G]-FF[+F[+G]-G]-F[+G]-G`

This output may look complicated, but try it out for yourself to see what nice pattern it produces. Take a look at the syntax:
* `0`/`1`/`f`/`F`/`g`/`G` : move forward (to be consistent with a lot of standards)
* `+` : rotate left
* `-` : rotate right
* `[` : save current location and angle
* `]` : restore previous location and angle
* All other characters don't have a functional meaning except for existing.

L-systems can be used as an alternative declarative way to describe natural patterns, including regular shapes such as the Sierpiński triangle.
The original application was generating pseudo-random looking branching structures, such as plants, to study their growth, as was done my Mr. Lindenmayer.

### Example output
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/linden_dragon.png" width="700" />
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/linden_plant.png" width="700"/>

> Warning: the visualiser may lag when using large iterations, since the number of geometry in the scene is exponential in relation to it.

## Marching Cubes Terrain
Terrain generator using `simplex-noise` and rendering the terrain using the [marching cubes](https://en.wikipedia.org/wiki/Marching_cubes) algorithm.
The terrain currently only has one color scheme and height thresholds for the colors, but an interactive editor will come soon.

> Note: the terrain generation is synchronous so it may stall the webapp for a few seconds. It also does not reuse vertex data per quad, so the performance is minimal.

### Example output
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/march.png" width="700" />

## How to run
### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
