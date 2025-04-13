# chemtools
(In)organic compound visualiser on the web, built with Vue & THREE.js.

## Technical Information
* ChemTools sends a request to (PubChem)[https://pubchem.ncbi.nlm.nih.gov/] & retrieves a SDF (Structural Data File).
* This file then gets parsed and converted into geometry, which in turn gets rendered by THREE.js.
* Vue manages reactive components and data.

The general response time is around 100ms for smaller molecules and under 500ms for larger compounds. Some large / unstable compounds don't inherenly support a 3D view, as the PubChem API briefly quotes:
> Conformer generation is disallowed since too many atoms, too flexible, too many undefined stereo centers
Below are a few examples of the structures generated:

<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/TNT.png" width="550" />
<img src="https://github.com/LMCuber/ChemTools/blob/main/previews/cubane.png" width="550"/>

## How to run
### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
