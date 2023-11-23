const postcss = require('postcss');
const postcssNesting = require('postcss-nesting');

module.exports = function (source) {
  console.log("Processing file:", this.resourcePath);

  const callback = this.async();

  processCSS(source)
    .then(result => {
      console.log("CSS processing completed.");
      callback(null, result);
    })
    .catch(err => {
      console.error("Error during CSS processing:", err);
      callback(err);
    });
};

function processCSS(source) {
  return new Promise((resolve) => {
    const styleRegex = /<style>([\s\S]*?)<\/style>/g;
    let match;
    let combinedCSS = '';
    const processingPromises = [];

    while ((match = styleRegex.exec(source))) {
      let cssContent = match[1];

      if (!cssContent.trim() || cssContent.includes('{{')) {
        console.log("Skipping empty or Liquid-syntax containing <style> tag.");
        continue;
      }

      const processingPromise = postcss([postcssNesting /*, other plugins if needed */])
        .process(cssContent, { from: undefined })
        .then(result => {
          console.log("PostCSS processing complete for one <style> tag.");
          combinedCSS += result.css;
        })
        .catch(err => {
          console.error("Error during PostCSS processing:", err);
          return { error: true, errorMsg: err.message };
        });

      processingPromises.push(processingPromise);
    }

    Promise.all(processingPromises).then(() => {
      if (combinedCSS) {
        // Remove all original <style> tags
        const cleanedSource = source.replace(styleRegex, '');
        // Prepend the combined <style> tag
        const finalSource = `<style>${combinedCSS}</style>\n${cleanedSource}`;
        console.log("All <style> tags processed and combined. Finalizing...");
        resolve(finalSource);
      } else {
        console.log("No CSS to process. Finalizing...");
        resolve(source);
      }
    });
  });
}
