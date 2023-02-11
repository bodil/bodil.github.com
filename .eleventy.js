const postcss = require("eleventy-plugin-postcss");
const syntax = require("@11ty/eleventy-plugin-syntaxhighlight");
const activitypub = require("eleventy-plugin-activity-pub");
const readmore = require("eleventy-plugin-read-more");
const rss = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPlugin(postcss);
    eleventyConfig.addPlugin(syntax);
    eleventyConfig.addPlugin(readmore);
    eleventyConfig.addPlugin(rss);

    eleventyConfig.addPlugin(activitypub, {
        domain: "bodil.lol",
        username: "articles",
        displayName: "Bodil dot lol",
        summary: "Articles from Bodil dot lol.",
        outbox: true,
        outboxCollection: "post",
    });

    eleventyConfig.addPassthroughCopy({ _static: "static" });
    eleventyConfig.addPassthroughCopy("**/*.gif");
    eleventyConfig.addPassthroughCopy("**/*.png");
    eleventyConfig.addPassthroughCopy("**/*.jpg");
    eleventyConfig.addPassthroughCopy("**/*.mp3");
    eleventyConfig.addPassthroughCopy("**/*.mp4");
    eleventyConfig.addPassthroughCopy("**/*.mkv");

    eleventyConfig.addPairedLiquidShortcode("exercises", function (content, slug) {
        return `<input id="exercises-${slug}" type="checkbox" />
        <label class="exercise" for="exercises-${slug}">Exercises</label>
        <div>${content}</div>`;
    });

    eleventyConfig.addPairedLiquidShortcode("define_footnote", function (content, name) {
        return `<a name="footnote_${name}">${name}</a>: ${content}`;
    });

    eleventyConfig.addLiquidShortcode("footnote", function (name) {
        return `<sup><a href="#footnote_${name}">${name}</a></sup>`;
    });

    eleventyConfig.addLiquidShortcode("gif", function (url) {
        return `<p class="gif"><img src="${url}"/></p>`;
    });

    return {
        htmlTemplateEngine: "liquid",
        markdownTemplateEngine: "liquid",
    };
};
