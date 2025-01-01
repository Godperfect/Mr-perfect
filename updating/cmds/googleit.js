const { GoatWrapper } = require('fca-liane-utils');
const axios = require('axios');

module.exports = {
	config: {
		name: 'googlesearch',
		aliases: ['googleit', 'search'],
		version: '1.0',
		author: 'Samir Œ',
		shortDescription: 'Perform a Google search using Google Custom Search API.',
		longDescription: 'Performs a Google search using Google Custom Search API and provides the top results.',
		category: 'Utility',
		guide: {
			en: '{pn} [search query]',
		},
	},

	onStart: async function ({ api, event, args }) {
		try {
			const searchQuery = args.join(' ');

			if (!searchQuery) {
				return api.sendMessage('Please provide a search query.', event.threadID, event.messageID);
			}

			const googleSearchResult = await performGoogleSearch(searchQuery);

			api.sendMessage(googleSearchResult, event.threadID, event.messageID);
		} catch (error) {
			console.error(error);
			api.sendMessage('An error occurred during the Google search.', event.threadID, event.messageID);
		}
	},
};

async function performGoogleSearch(query) {
	try {
		const apiKey = 'AIzaSyCTdaokx2d3hiXTHpsTILabjET7Vr4HwSI'; // Your API Key
		const cx = '97e227b9587184799'; // Your Custom Search Engine ID (CX)
		const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;

		// Send the request to Google's Custom Search API
		const { data } = await axios.get(url);

		if (!data.items || data.items.length === 0) {
			return 'No results found for your search query.';
		}

		let resText = `🔍 **Search Results for: ${query}**\n\n`;

		// Format the search results
		for (let num = 0; num < Math.min(5, data.items.length); num++) {
			resText += `📍Result ${num + 1}:\n\n Title: ${data.items[num].title}\n\nDescription: ${data.items[num].snippet}\n\nLink: [${data.items[num].link}](${data.items[num].link})\n\n`;
		}

		console.log(resText);  // For debugging purposes
		return resText;
	} catch (error) {
		console.error('Error during Google search:', error);
		return 'An error occurred while performing the Google search.';
	}
}

const wrapper = new GoatWrapper(module.exports);
wrapper.applyNoPrefix({ allowPrefix: true });