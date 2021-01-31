import logStamp from '../util/log.js';
import stopWords from './stopWords.js';

const session = {
    conversationKeyPhrases: [],
    conversationEntities: [],
    conversationSentiment: {},
    clear: function () {
        this.conversationKeyPhrases = [];
        this.conversationEntities = [];
        this.conversationSentiment = {};
    }
}

const getEntitiesHtml = () => {
    let entitiesHtml = '';
    if (session.conversationEntities.length > 0) {
        entitiesHtml = '<table style="margin-bottom: 5px; border-collapse: collapse; width: auto !important;">' +
            '<tr>' +
            '<th style="text-align: left; border-bottom: 2px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">Entity</th>' +
            '<th style="text-align: left; border-bottom: 2px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">Category</th>' +
            '<th style="text-align: left; border-bottom: 2px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">Confidence</th>' +
            '</tr>';
        session.conversationEntities.forEach((element) => {
            entitiesHtml += '<tr>' +
                '<td style="border-bottom: 1px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">' + element.Text + '</td>' +
                '<td style="border-bottom: 1px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">' + element.Type + '</td>' +
                '<td style="border-bottom: 1px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">' + element.Score.toString().substring(0, 4) + '</td>' +
                '</tr>';
        });
        entitiesHtml += '</table>'
    }
    return entitiesHtml;
}

const getKeyPhrasesHtml = () => {
    let keyPhrasesHtml = '';
    if (session.conversationKeyPhrases.length > 0) {
        keyPhrasesHtml = '<table style="border-collapse: collapse; width: auto !important;">' +
            '<tr>' +
            '<th style="text-align: left; border-bottom: 2px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">Key phrase</th>' +
            '<th style="text-align: left; border-bottom: 2px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">Confidence</th >' +
            '</tr>';
        session.conversationKeyPhrases.forEach((element) => {
            keyPhrasesHtml += '<tr>' +
                '<td style="border-bottom: 1px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">' + element.Text + '</td>' +
                '<td style="border-bottom: 1px solid #ddd; border-right: 0; border-left: 0; border-top: 0; padding: 4px 10px;">' + element.Score.toString().substring(0, 4) + '</td>' +
                '</tr>';
        });
        keyPhrasesHtml += '</table>'
    }
    return keyPhrasesHtml;
}

const createEntitiesSpanWithColors = (entity, text, score) => {
    const m = parseFloat(score * 100).toFixed(2);
    const newEntitiesSpan = '<span><awsui-tooltip class="entity_word line_color_' + entity.toLowerCase() + ' initialized="true"><span><span class="awsui-tooltip-trigger" awsui-tooltip-region="trigger" original-title="' + entity + ' [' + m + '%]">' + text + '</span></span></awsui-tooltip></span>';
    return newEntitiesSpan;
}

const redrawSentiment = (type, value) => {
    const dashSize = 377;
    const oldValues = {
        'Positive': dashSize,
        'Negative': dashSize
    };

    const changeKeyframeRule = (animation, newValue) => {
        Object.values(document.styleSheets).forEach((styleSheet) => {
            Object.values(styleSheet.cssRules).forEach((rule) => {
                if (rule.type == window.CSSRule.KEYFRAMES_RULE && rule.name == animation)
                    rule.cssRules[0].style['stroke-dashoffset'] = newValue;
            });
        });
    }

    const percentage = Math.floor(value * 100);
    const heading = document.getElementById('label' + type);
    heading.innerText = percentage;
    const circle = document.getElementById('circle' + type);
    changeKeyframeRule('donut' + type, oldValues[type]);
    const newValue = (100 - percentage) * (dashSize / 100);
    oldValues[type] = newValue;
    circle.classList.remove("donut-" + type.toLowerCase());
    setTimeout(() => {
        circle.style['stroke-dashoffset'] = newValue;
        circle.classList.add("donut-" + type.toLowerCase())
    }, 0);
}

export default {

    session,

    updateKeyPhrases: (data, subdomain) => {
        const storedPhrases = session.conversationKeyPhrases;
        if (data.KeyPhrases) {
            data.KeyPhrases.forEach((element) => {
                let keyPhrase = element.Text;
                if (!storedPhrases.map((e) => e.Text).includes(keyPhrase)) {
                    let phraseElement = keyPhrase;
                    if (!stopWords.includes(keyPhrase.toLowerCase()) && isNaN(keyPhrase.replace(/[\s$.,]/g, ''))) {
                        const searchUrl = `https://${subdomain}.zendesk.com/hc/en-us/search?query=${encodeURIComponent(keyPhrase)}`;
                        phraseElement = `<a href="${searchUrl}" target="_blank">${keyPhrase}</a>`;
                    }
                    const appendHtml = `<tr><td>${phraseElement}</td><td>${element.Score.toString().substring(0, 4)}</td></tr>`;
                    localStorage.setItem('vf.key-phrases', appendHtml);
                    storedPhrases.push(element);
                }
            });
        }
    },

    updateEntities: (data, text) => {
        if (data.Entities) {
            data.Entities.forEach((element) => {
                // console.log(logStamp('entity:'), element);
                const appendHtml = `<tr><td>${element.Text}</td><td>${element.Type}</td><td>${element.Score.toString().substring(0, 4)}</td></tr>`
                localStorage.setItem('vf.entities-element', appendHtml);
                session.conversationEntities.push(element);
                const span = createEntitiesSpanWithColors(element.Type, element.Text, element.Score);
                text = text.replace(element.Text, span);
            });
        }
    },

    getComprehendHtml: () => {
        let comprehendHtml = '';
        if (session.conversationEntities.length > 0 || session.conversationKeyPhrases.length > 0) {
            comprehendHtml = '<div style="border: 1px solid #ccc; margin-bottom: 5px;">' +
                '<div style="font-weight: bold; font-size: 110%; padding: 6px 16px; border-bottom: 1px solid #ccc; background-color: white;">Entities and key phrases</div>' +
                '<div style="padding: 10px 16px; background-color: #fafafa; font-size: 90%;">';
            comprehendHtml += getEntitiesHtml();
            comprehendHtml += getKeyPhrasesHtml();
            comprehendHtml += '</div></div>';
        }
        return comprehendHtml;
    },

    getSentimentHtml: () => {
        let sentimentHtml = '';
        const sentiment = session.conversationSentiment;
        sentimentHtml += '<div style="border: 1px solid #ccc; margin-bottom: 5px;">' +
            '<div style="font-weight: bold; font-size: 110%; padding: 6px 16px; border-bottom: 1px solid #ccc; background-color: white;">Sentiment analysis</div>' +
            '<div style="padding: 10px 16px; background-color: #fafafa; font-size: 90%;">' +
            '<div><span style="font-weight: bold;">Overall Sentiment: </span><span>' + sentiment.Sentiment + '</span></div>' +
            '<div><span style="font-weight: bold;">POSITIVE: </span><span>' + Math.floor(sentiment.SentimentScore.Positive * 100) + '%</span></div>' +
            '<div><span style="font-weight: bold;">NEUTRAL: </span><span >' + Math.floor(sentiment.SentimentScore.Neutral * 100) + '%</span></div>' +
            '<div><span style="font-weight: bold;">NEGATIVE: </span><span>' + Math.floor(sentiment.SentimentScore.Negative * 100) + '%</span></div>' +
            '<div><span style="font-weight: bold;">MIXED: </span><span>' + Math.floor(sentiment.SentimentScore.Mixed * 100) + '%</span></div>' +
            '</div>' +
            '</div>';
        return sentimentHtml;
    },

    getTranscriptHtml: (transcriptHtml) => {

        if (transcriptHtml.length > 0) {

            let regex = new RegExp('agent-row"><div ', "g");
            transcriptHtml = transcriptHtml.replace(regex, 'agent-row"><div style="margin: 3px; padding: 5px 10px; border-radius: 5px; max-width: 300px; background-color: #03363D;"');

            regex = new RegExp('customer-row"><div ', "g");
            transcriptHtml = transcriptHtml.replace(regex, 'customer-row"><div style="margin: 3px; padding: 5px 10px; border-radius: 5px; max-width: 300px; background-color: #30AABC;"');

            regex = new RegExp('class="transcript-row agent-row"', "g");
            transcriptHtml = transcriptHtml.replace(regex, 'style="display: flex; color: white; font-size: 80%; justify-content: flex-start;" ');

            regex = new RegExp('class="transcript-row customer-row"', "g");
            transcriptHtml = transcriptHtml.replace(regex, 'style="display: flex; color: white; font-size: 80%; justify-content: flex-end;" ');

            transcriptHtml = '<div style="border: 1px solid #ccc;">' +
                '<div style="font-weight: bold; font-size: 110%; padding: 6px 16px; border-bottom: 1px solid #ccc; background-color: white;">Conversation transcript</div>' +
                '<div style="padding: 10px 16px; background-color: #fafafa;">' +
                transcriptHtml +
                '</div></div>';
        }
        return transcriptHtml;
    },
    
    refreshSentiment: (data) => {
        $('#overallSentiment').html(data.Sentiment);
        const score = data.SentimentScore;
        redrawSentiment('Positive', score.Positive);
        redrawSentiment('Negative', score.Negative);
        redrawSentiment('Neutral', score.Neutral);
        redrawSentiment('Mixed', score.Mixed);
    },

    resetComprehendTables: () => {
        $("#entitiesTable").html("<tr><th>Entity</th><th>Category</th><th>Confidence</th></tr>");
        $("#keyPhrasesTable").html("<tr><th>Key phrase</th><th>Confidence</th></tr>");
    },

    resetSentiment: () => {
        $('#overallSentiment').html("");
        redrawSentiment('Positive', 0);
        redrawSentiment('Negative', 0);
        redrawSentiment('Neutral', 0);
        redrawSentiment('Mixed', 0);
    }

}