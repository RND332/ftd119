const TwitterAPI = 'https://api.fxtwitter.com/status';

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            alert('Hello from the service worker!');
        }
    });
});

// get message from content.js
chrome.runtime.onMessage.addListener(async (message) => {
    console.log('Message:', message);
    const { TwitterPostId, TwitterImageId, TwitterVideoSrc } = message;
    
    await saveMetadataToLocalDB(TwitterPostId);
    await processCall(TwitterPostId, TwitterImageId, TwitterVideoSrc);
});

async function processCall(twitterPostId, twitterImageId, twitterVideoSrc) {
    const _twitterImageId = twitterImageId - 1;
    const id = await getTweetIdFromPage();
    if (id) {
        // user is on the tweet page, so we can get the metadata of the tweet
        const metadata = await getTweetMetadata(id, twitterVideoSrc);
        console.log('Tweet metadata:', metadata);

        /** @type {boolean} */
        const downloadImages = metadata.tweetImages.length > 0;
        /** @type {boolean} */
        const downloadVideos = metadata.tweetVideos.length > 0;

        if (downloadImages) {
            if (_twitterImageId > -1) {
                chrome.downloads.download({
                    url: metadata.tweetImages[_twitterImageId],
                    filename: `${metadata.tweetDate}-${metadata.username}-${_twitterImageId}-image.jpg`,
                    conflictAction: 'uniquify',
                    saveAs: false
                });
            } else {
                for (let i = 0; i <= metadata.tweetImages.length; i++) {
                    chrome.downloads.download({
                        url: metadata.tweetImages[i],
                        filename: `${metadata.tweetDate}-${metadata.username}-${i}-image.jpg`,
                        conflictAction: 'uniquify',
                        saveAs: false
                    });
                }
            }
        }

        if (downloadVideos) {
            for (let i = 0; i < metadata.tweetVideos.length; i++) {
                // get highest quality video
                chrome.downloads.download({
                    url: metadata.tweetVideos[i],
                    filename: `${metadata.tweetDate}-${metadata.username}-${i}-video.mp4`,
                    conflictAction: 'uniquify',
                    saveAs: false
                });
            }
        }

        return;
    }

    // user is not on the tweet page, so we can get the metadata of the tweet
    const metadata = await getTweetMetadata(twitterPostId, twitterVideoSrc);

    /** @type {boolean} */
    const downloadImages = metadata.tweetImages.length > 0;
    /** @type {boolean} */
    const downloadVideos = metadata.tweetVideos.length > 0;

    if (downloadImages) {
        if (_twitterImageId > -1) {
            console.log('Downloading image:', metadata.tweetImages[_twitterImageId], '_twitterImageId', _twitterImageId);
            chrome.downloads.download({
                url: metadata.tweetImages[_twitterImageId].url,
                filename: `${metadata.tweetDate}-${metadata.username}-${_twitterImageId}-image.jpg`,
                conflictAction: 'uniquify',
                saveAs: false
            });
        } else {
            for (let i = 0; i <= metadata.tweetImages.length; i++) {
                chrome.downloads.download({
                    url: metadata.tweetImages[i].url,
                    filename: `${metadata.tweetDate}-${metadata.username}-${i}-image.jpg`,
                    conflictAction: 'uniquify',
                    saveAs: false
                });
            }
        }
    }

    if (downloadVideos) {
        for (let i = 0; i < metadata.tweetVideos.length; i++) {
            // get highest quality video
            chrome.downloads.download({
                url: metadata.tweetVideos[i],
                filename: `${metadata.tweetDate}-${metadata.username}-${i}-video.mp4`,
                conflictAction: 'uniquify',
                saveAs: false
            });
        }
    }
}

/** 
 * Find the link to the tweet.
 * @returns {Promise<string | null>} - The id of the tweet.
*/
async function getTweetIdFromPage() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const url = tab.url;

    // regex tweet id 
    const tweetIdRegex = /\d+/;
    const id = url.match(tweetIdRegex);

    if (!id) return null;

    return id[0];
}

/**
 * Get the metadata of a tweet.
 * @param {string} tweetId - The URL of the tweet.
 * @param {string | null} videoTrumbnail - The URL of the tweet video thumbnail.
 * @returns {object} - The metadata of the tweet.
 * @property {string} username - The username of the tweet author.
 * @property {string} tweetId - The ID of the tweet.
 * @property {string} tweetText - The text of the tweet.
 * @property {string} tweetUrl - The URL of the tweet.
 * @property {string[]} tweetImages - The URL of the tweet image.
 * @property {string[]} tweetVideos - The URL of the tweet video.
 * @property {string} tweetDate - The date of the tweet.
*/
async function getTweetMetadata(tweetId, videoTrumbnail = null) {
    // fetch tweet metadata from the Twitter API
    const url = new URL(`${TwitterAPI}/${tweetId}`);
    const response = await fetch(url);

    /** @type {TwitterPostMetadata} */
    const data = await response.json();

    // extract tweet metadata
    const username = data.tweet.author.screen_name;
    const tweetText = data.tweet.text;
    const tweetUrl = data.tweet.url;
    const tweetImages = data.tweet.media.all.filter(media => media.type === 'photo');
    const videos = data.tweet.media.all.filter(media => media.type === 'video');

    let tweetVideos = [];

    if (videoTrumbnail) {
        const videoWeNeed = data.tweet.media.videos.filter(media => media.thumbnail_url === videoTrumbnail);
        const HQVideo = videoWeNeed[0].variants.reduce((prev, current) => (prev.bitrate > current.bitrate) ? prev : current);
        tweetVideos = [HQVideo.url];
    } else {
        if (videos.length > 0) {
            tweetVideos = data.tweet.media.videos.map(media => media.url);
        }
    }

    const rawDate = data.tweet.created_at;
    // convert unix timestamp to date mm/dd/MM/YY
    const tweetDate = getFormatedDate(rawDate);

    return { username, tweetId, tweetText, tweetUrl, tweetImages, tweetVideos, tweetDate };
}

/**
 * Return typed metadata of the tweet.
 * @param {string} tweetId
 * @returns {Promise<TwitterPostMetadata>} 
 */
async function getRawTweetMetadata(tweetId) {
    const url = new URL(`${TwitterAPI}/${tweetId}`);
    const response = await fetch(url);

    return response.json();
}

/**
 * Get formatted date.
 * @param {number} data - The date of the tweet.
 * @returns {string} - The formatted date of the tweet. 
 */
function getFormatedDate(rawData) {
    const data = new Date(rawData);
    return `[${[
        data.getMonth() + 1,
        data.getDate(),
        data.getFullYear()
    ].join('-') + '-' + [
        data.getHours(),
        data.getMinutes(),
        data.getSeconds()
    ].join('-')}]`;
}

/** 
 * @param {string} TwitterPostId
 * @param {string} TwitterImageId
 * @param {string} TwitterVideoSrc
*/
async function saveMetadataToLocalDB(TwitterPostId) {
    // save the metadata to the local storage
    const metadata = await getRawTweetMetadata(TwitterPostId);
    if (!metadata) return;

    const rawDoc = await chrome.storage.local.get(['savedTweets']);
    if (!rawDoc.savedTweets) {
        await chrome.storage.local.set({ 'savedTweets': JSON.stringify({ savedTweets: [metadata] }) });
        return;
    }
    
    /** @type {SavedTweets} - Format we store saved posts */
    const rawSavedTweets = JSON.parse(rawDoc.savedTweets);

    /** @type {Array<SavedTweets>} */
    const savedTweets = rawSavedTweets.savedTweets;
    savedTweets.push(metadata);

    await chrome.storage.local.set({ 'savedTweets': JSON.stringify({ savedTweets }) });
}

/** 
 * @typedef {object} TwitterAPIPostMetadata
 * @property {string} username
 * @property {string} tweetId
 * @property {string} tweetText
 * @property {string} tweetUrl
 * @property {string[]} tweetImages
 * @property {string[]} tweetVideos
 * @property {string} tweetDate
 */

// definition of the tweet metadata in JSdoc format
/**
 * @typedef {object} TwitterPostMetadata
 * @property {number} code
 * @property {string} message
 * @property {object} tweet
 * @property {string} tweet.url
 * @property {string} tweet.id
 * @property {string} tweet.text
 * @property {object} tweet.author
 * @property {string} tweet.author.id
 * @property {string} tweet.author.name
 * @property {string} tweet.author.screen_name
 * @property {string} tweet.author.avatar_url
 * @property {string} tweet.author.banner_url
 * @property {string} tweet.author.description
 * @property {string} tweet.author.location
 * @property {string} tweet.author.url
 * @property {number} tweet.author.followers
 * @property {number} tweet.author.following
 * @property {string} tweet.author.joined
 * @property {number} tweet.author.likes
 * @property {object} tweet.author.website
 * @property {string} tweet.author.website.url
 * @property {string} tweet.author.website.display_url
 * @property {number} tweet.author.tweets
 * @property {null} tweet.author.avatar_color
 * @property {number} tweet.replies
 * @property {number} tweet.retweets
 * @property {number} tweet.likes
 * @property {string} tweet.created_at
 * @property {number} tweet.created_timestamp
 * @property {boolean} tweet.possibly_sensitive
 * @property {number} tweet.views
 * @property {boolean} tweet.is_note_tweet
 * @property {null} tweet.community_note
 * @property {string} tweet.lang
 * @property {null} tweet.replying_to
 * @property {null} tweet.replying_to_status
 * @property {object} tweet.media
 * @property {object[]} tweet.media.all
 * @property {string} tweet.media.all.url
 * @property {string} tweet.media.all.thumbnail_url
 * @property {number} tweet.media.all.duration
 * @property {number} tweet.media.all.width
 * @property {number} tweet.media.all.height
 * @property {string} tweet.media.all.format
 * @property {string} tweet.media.all.type
 * @property {object[]} tweet.media.all.variants
 * @property {string} tweet.media.all.variants.content_type
 * @property {string} tweet.media.all.variants.url
 * @property {number} tweet.media.all.variants.bitrate
 * @property {object[]} tweet.media.videos
 * @property {string} tweet.media.videos.url
 * @property {string} tweet.media.videos.thumbnail_url
 * @property {number} tweet.media.videos.duration
 * @property {number} tweet.media.videos.width
 * @property {number} tweet.media.videos.height
 * @property {string} tweet.media.videos.format
 * @property {string} tweet.media.videos.type
 * @property {object[]} tweet.media.videos.variants
 * @property {string} tweet.media.videos.variants.content_type
 * @property {string} tweet.media.videos.variants.url
 * @property {number} tweet.media.videos.variants.bitrate
 * @property {string} tweet.source
 * @property {string} tweet.twitter_card
 * @property {null} tweet.color
 */

// definition of the saved tweets in the local storage
/**
 * @typedef {object} SavedTweets
 * @property {Array<TwitterPostMetadata>} StoredTweets
*/
