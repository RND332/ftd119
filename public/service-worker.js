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
chrome.runtime.onMessage.addListener((message) => {
    console.log('Message:', message);

    const { TwitterPostId, TwitterImageId, TwitterVideoSrc } = message;
    processCall(TwitterPostId, TwitterImageId, TwitterVideoSrc);
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
 * @returns {string | null} - The id of the tweet.
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

    /**  @type {TwitterPostMetadata} */
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
    * Get the token from the tweet id.
    * @param {string} tweetId The ID of the tweet.
    * @returns {string} The token of the tweet.
    * @property {string} token The token of the tweet.
*/
function getToken(tweetId) {
    return ((Number(tweetId) / 1e15) * Math.PI)
        .toString(6 ** 2)
        .replace(/(0+|\.)/g, '')
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
