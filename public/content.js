/** @type {string} */
let twitterPostId = null;
let twitterImageId = null;
let twitterVideoSrc = null;

let hoveredElement = null;

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();


        chrome.runtime.sendMessage({ TwitterPostId: twitterPostId, TwitterImageId: twitterImageId, TwitterVideoSrc: twitterVideoSrc });
    }
});

document.addEventListener('mousemove', function (event) {
    if (!event) return;
    if (!event.target) return;
    if (event.target === hoveredElement) return;
    if (!event.target.tagName) return;

    if (event.target.tagName === 'IMG' && event.target.src.includes('https://pbs.twimg.com/media/')) {
        // in case user hovers over the specific image in the tweet
        // we just go up of the DOM until we find the <a> tag with the link to the tweet AND image id
        let element = event.target;
        console.log(element);
        while (element.tagName !== 'A') {
            element = element.parentElement;
        }

        const data = element.href.split('/');

        const tweetID = data[5];
        const imageID = data[7];

        if (tweetID && imageID) {
            twitterPostId = tweetID;
            twitterImageId = imageID;
        }
    } else {
        twitterImageId = 0;
    }

    if (event.target.tagName === 'DIV') {
        // if its some random div, we need to check maybe its a video
        // to do this we need to check if the div has a parent with data-testid="videoPlayer"
        // if yes, then we need to get the index of this video in the tweet
        // to do this we check all the children of the data-testid="videoPlayer" div
        // and find the link to source unide <video> tag
        // its placed under the poster attribute, when we have the link we can get the video trumbnail
        // we can find video url in the fxtwitter API response for this tweeet
        let element = event.target;

        while (element.getAttribute('data-testid') !== 'videoPlayer') {
            if (!element.parentElement) break;
            element = element.parentElement;
        }

        if (element.getAttribute('data-testid') === 'videoPlayer') {
            const video = element.querySelector('video');
            const videoSrc = video.getAttribute('poster');

            twitterVideoSrc = videoSrc;
        }
    } else {
        twitterVideoSrc = null;
    }

    const tweetStatusRegex = /status\/[0-9]+/g;

    hoveredElement = event.target;
    const link = findLinkToTweet(hoveredElement);

    if (!link) return;

    const id = link.match(tweetStatusRegex)[0].replace('status/', '');

    if (link && id !== twitterPostId) {
        twitterPostId = id;
    }
});

/** 
 * Find the link to the tweet in the current page under the cursor.
 * @param {EventTarget} event - The mouse event.
 * @param {boolean} foundTweet - A flag to indicate if the tweet has been found.
 * @returns {string | null} - The link to the tweet.
 */
function findLinkToTweet(event, foundTweet = false) {
    // recursive function to find the tweet link
    // iterate over children of the current element
    // until we find <a> tag with href containing 'status'
    const element = event;
    if (!element) return null;
    if (!element.tagName) return null;

    // if we are not at the element <article>, go to the parent element
    // we dont need go above current element, if we already at the <article> tag
    if (!foundTweet) {
        if (element.tagName !== 'ARTICLE') {
            return findLinkToTweet(element.parentElement);
        } else {
            foundTweet = true;
        }
    }

    if (element.tagName === 'A') {
        if (element.href.includes('status')) {
            return element.href;
        }
    }

    if (element.children.length === 0) return null;

    for (let i = 0; i < element.children.length; i++) {
        const link = findLinkToTweet(element.children[i], foundTweet);
        if (link) return link;
    }
}

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

// definition of the tweet metadata we are interested in
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
