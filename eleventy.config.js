export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'data/uploads/45': 'wp-content/uploads/sites/45' });
  eleventyConfig.addPassthroughCopy({ 'src/CNAME': 'CNAME' });
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': 'robots.txt' });
  return { dir: { input: 'src', output: '_site' }, htmlTemplateEngine: false, markdownTemplateEngine: false };
}
