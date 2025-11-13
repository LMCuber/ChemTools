# LWV
_LMCuber's Werke Verzeichnis_ for the web.

## chemtools
(In)organic compound visualiser on the web, built with Vue & THREE.js.

* ChemTools sends a request to [PubChem](https://pubchem.ncbi.nlm.nih.gov/) & retrieves a SDF (Structural Data File).
* This file then gets parsed and converted into geometry, which in turn gets rendered by THREE.js.
* Vue manages reactive components and data.

The general response time is around 100ms for smaller molecules and under 500ms for larger compounds. Some large / unstable compounds don't inherenly support a 3D view, as the PubChem API briefly quotes:
> Conformer generation is disallowed since too many atoms, too flexible, too many undefined stereo centers

### Example output
Below are a few examples of the structures generated:

<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/chem_egfr.png" width="700" />
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/chem_cubane.png" width="700"/>

## L-systems
Interactive editor for _Lindenmayer_ systems. An L-system describes a procedure where the rules of a formal language are applied onto itself in parallel.
To put simply, it generates a new output string given a starting value (an _axiom_), and rewrite rules. Below is an example of such a system:
* Axiom: G
* Rules:
    * G -> F[+G]-G
    * F -> FF

When applying rules, we get:
    * _n = 0_ : `G`
    * _n = 1_ : `F[+G]-G`
    * _n = 2_ : `FF[+F[+G]-G]-F[+G]-G`
    * _n = 3_ : `FFFF[+FF[+F[+G]-G]-F[+G]-G]-FF[+F[+G]-G]-F[+G]-G`
This output may look complicated, but try it out for yourself to see what nice pattern it produces.

L-systems can be used as an alternative declarative way to describe natural patterns, including regular shapes such as the Sierpiński triangle.
The main application is generating pseudo-random looking branching structures, such as plants.

### Example output
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/linden_dragon.png" width="700" />
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/linden_plant.png" width="700"/>

## How to run
### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
