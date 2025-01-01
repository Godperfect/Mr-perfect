const { GoatWrapper } = require('fca-liane-utils');
const axios = require('axios');

module.exports = {
  config: {
    name: "googleimg",
    author: "Mr perfect",
    version: "2.3",
    shortDescription: "Search for images using Google Custom Search API",
    longDescription: "Search for images using Google Custom Search API and return a specified number of results.",
    category: "utility",
    guide: {
      en: "Use the command followed by your search query and number of images. Example: 'googleimg 5 cats' to get 5 images of cats.",
    },
  },

  onStart: async function ({ args, message }) {
    try {
      // Check if the user has provided both the number and query
      if (args.length < 2) {
        return message.reply("Please provide both the number of images and the search query (e.g., 'googleimg 5 cat').");
      }

      // Get the number of results (first argument)
      const numResults = parseInt(args[0]);
      if (isNaN(numResults) || numResults <= 0) {
        return message.reply("The first argument must be a valid number (e.g., 'googleimg 5 cat').");
      }

      // Get the search query (the rest of the arguments)
      const query = args.slice(1).join(' ');

      // Google Custom Search API configuration
      const cx = '97e227b9587184799'; // Custom Search Engine ID
      const apiKey = 'AIzaSyCTdaokx2d3hiXTHpsTILabjET7Vr4HwSI'; // Google API Key
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&searchType=image&num=${numResults}&cx=${cx}&key=${apiKey}`;

      // Fetch image results using Google Custom Search API
      const { data } = await axios.get(url);

      // Check if there are results
      if (!data.items || data.items.length === 0) {
        return message.reply(`No images found for "${query}".`);
      }

      // Fetch the images and prepare the attachments
      const attachments = await Promise.all(
        data.items.map(item => global.utils.getStreamFromURL(item.link))
      );

      // Send the images in the message
      return message.reply({
        body: `Here are the top ${numResults} image results for "${query}":`,
        attachment: attachments,
      });
    } catch (error) {
      console.error("Error fetching images:", error.response ? error.response.data : error.message);
      return message.reply("Sorry, I couldn't fetch the images. Please try again later.");
    }
  },
};

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });