import { ref, Ref } from "vue";
import { createNoise3D } from "simplex-noise";

/**
 * A Vue composable for generating 3D Simplex Noise.
 * * @param initialSeed An optional initial seed value (string or number) for the noise.
 */
export function useNoise(initialSeed?: number | string) {
  // Use a sensible default seed if none is provided
  const defaultSeed = initialSeed ?? Math.random();
  const seed: Ref<number | string> = ref(defaultSeed);

  // Initialize the 3D noise function
  let noise3D = initializeNoise(defaultSeed);

  /**
   * Initializes the Simplex noise function with a PRNG seeded by the given value.
   * @param s The seed value.
   * @returns The 3D noise function.
   */
  function initializeNoise(s: number | string) {
    // alea takes a string/number and returns a seeded random function (prng)
    const prng = Math.random;
    // createNoise3D uses the prng to initialize its permutation table, 
    // ensuring the noise is reproducible.
    return createNoise3D(prng);
  }

  /**
   * Generates a single sample of 3D Simplex noise.
   * @param x X coordinate.
   * @param y Y coordinate.
   * @param z Z coordinate.
   * @returns A noise value between -1.0 and 1.0.
   */
  const noise = (x: number, y: number, z: number): number => {
    // The noise function is already bound to the initialized seed
    return noise3D(x, y, z); 
  };

  /**
   * Generates fractal or "Octave Noise" by combining multiple layers (octaves)
   * of the base noise function at increasing frequencies and decreasing amplitudes.
   * * @param x X coordinate.
   * @param y Y coordinate.
   * @param z Z coordinate.
   * @param octaves The number of noise layers to sum (default: 4).
   * @param persistence How much the amplitude decreases for each octave (default: 0.5).
   * @returns A combined noise value, typically normalized to a range close to [-1, 1].
   */
  const octaveNoise = (
    x: number, 
    y: number, 
    z: number, 
    octaves: number = 4, 
    persistence: number = 0.5
  ): number => {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0; // Used for normalizing the result

    for (let i = 0; i < octaves; i++) {
      // Get noise value for this octave
      total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;

      maxValue += amplitude; // Keep track of maximum possible amplitude
      amplitude *= persistence; // Decrease amplitude for next octave
      frequency *= 2; // Increase frequency (making the next layer "busier")
    }

    // Normalize the result to keep it close to the [-1, 1] range
    return total / maxValue;
  };

  /**
   * Re-initializes the noise generator with a new seed value.
   * @param newSeed The new seed value (string or number).
   */
  const reseed = (newSeed: number | string) => {
    // 1. Update the reactive state
    seed.value = newSeed; 
    // 2. Re-initialize the internal noise function
    noise3D = initializeNoise(newSeed); 
  };

  return {
    seed,
    noise, // single noise function
    octaveNoise, // fractal noise function
    reseed,
  };
}