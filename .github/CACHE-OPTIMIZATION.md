# Lighthouse CI Workflow Cache Optimizations

This document explains the caching optimizations implemented in the Lighthouse CI workflow to improve performance and resource efficiency.

## Cache Key Improvements

### Previous Implementation

Originally, the workflow used GitHub's `run_id` as the basis for cache keys:

```yaml
SYSTEM_DEPS_CACHE_KEY: system-deps-${{ github.run_id }}
TOOLS_CACHE_KEY: tools-${{ github.run_id }}
NPM_GLOBAL_CACHE_KEY: npm-global-${{ github.run_id }}
PUPPETEER_CACHE_KEY: puppeteer-${{ github.run_id }}
GH_PAGES_CACHE_KEY: gh-pages-${{ github.run_id }}
```

This approach created new caches for every workflow run, preventing effective cache reuse and increasing GitHub Actions storage usage.

### Optimized Implementation

The updated implementation uses content-based hashing for cache keys, which allows for:

- Cache reuse across workflow runs when dependencies haven't changed
- More efficient storage usage
- Faster workflow execution

```yaml
SYSTEM_DEPS_CACHE_KEY: system-deps-${{ hashFiles('.github/workflows/scripts/**/*.sh') }}-${{ runner.os }}
TOOLS_CACHE_KEY: tools-${{ hashFiles('.github/actions/**/*.yml') }}-${{ runner.os }}
NPM_GLOBAL_CACHE_KEY: npm-global-${{ hashFiles('package.json', 'package-lock.json', '.github/workflows/scripts/run-lighthouse.sh') }}-${{ runner.os }}
PUPPETEER_CACHE_KEY: puppeteer-${{ hashFiles('.github/workflows/scripts/run-lighthouse.sh') }}-${{ runner.os }}
GH_PAGES_CACHE_KEY: gh-pages-${{ github.repository }}-${{ github.ref }}
```

## Consolidated Cache Actions

### Previous Implementation

The workflow previously used multiple separate cache actions, each with its own key and path.

### Optimized Implementation

We've consolidated cache operations in the setup-environment action:

1. Combined multiple cache paths into a single cache action
2. Simplified cache key generation and restoration
3. Added proper fallback with restore-keys to enable partial cache hits

```yaml
- name: Cache all dependencies
  uses: actions/cache@v4
  id: cache-all-deps
  with:
    path: |
      ~/.cache/apt
      ~/.apt-cache
      ~/.cache/tools
      ~/.cache/puppeteer
      ~/.npm
    key: ${{ inputs.cache-key-prefix }}
    restore-keys: |
      ${{ inputs.cache-key-prefix }}-
      ${{ runner.os }}-tools-
      ${{ runner.os }}-npm-
```

## Benefits

1. **Faster Workflow Execution**

   - Reduced redundant downloads and installations
   - More efficient dependency restoration

2. **Improved Cache Efficiency**

   - Caches are reused across runs when content hasn't changed
   - Progressive cache updates only when necessary

3. **Reduced GitHub Storage Usage**

   - Fewer duplicate caches stored in GitHub Actions
   - Better utilization of GitHub's cache storage limits

4. **More Reliable Performance Testing**
   - Consistent environment setups across runs
   - More stable performance testing results

## Notes for Future Maintenance

When updating dependencies or scripts:

- The cache will automatically refresh due to hash changes
- No manual cache invalidation should be necessary
- If cache issues occur, you can manually clear caches in GitHub Actions settings
