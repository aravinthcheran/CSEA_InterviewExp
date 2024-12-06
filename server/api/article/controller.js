const ErrorResponse = require("../../util/errorResponse");
const asyncHandler = require("../../middleware/async");
const Article = require("./model");
const axios = require("axios");
const nodemailer = require("nodemailer");
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPTR_SECRET);
const { htmlToText } = require("html-to-text");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const { compileTemplate } = require("../../services/handlebars");
const { generateMailBody } = require("../../services/mailer");
const fetch = require("node-fetch");

const oauth2Client = new OAuth2(
	process.env.CLIENT_ID,
	process.env.CLIENT_SECRET, // Client Secret
	"https://developers.google.com/oauthplayground" // Redirect URL
);
oauth2Client.setCredentials({
	refresh_token: process.env.REFRESH_TOKEN,
});
const accessToken = oauth2Client.getAccessToken();
// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_ID,
		pass: process.env.EMAIL_PASS,
	},
});

// @route : /api/v1/article/
// @req-type : POST
// @description : Add new article
exports.addArticle = asyncHandler(async (req, res, next) => {
	console.log("Adding article", req.body);
	const response = await axios.get(
		`https://autocomplete.clearbit.com/v1/companies/suggest?query=${req.body.companyName}`
	);
	let companyDomainName;
	if (response.data.length === 0) {
		companyDomainName =
			"https://cdn.pixabay.com/photo/2014/04/02/17/03/globe-307805_960_720.png";
	} else {
		companyDomainName = response.data[0].logo;
	}
	const body = {
		title: req.body.title,
		typeOfArticle: req.body.typeOfArticle,
		companyName: req.body.companyName,
		companyDomainName,
		description: req.body.description,
		articleTags: req.body.articleTags,
		showName: req.body.showName,
		author: {
			name: req.body.author.name,
			contact: req.body.author.contact,
		},
	};
	const article = await Article.create(body);
	const encryptedString = cryptr.encrypt(article._id);
	await sendMail(body, encryptedString);
	return res.status(200).json({
		success: true,
		message: "Article added successfully",
		article,
	});
});

// @route : /api/v1/article/
// @req-type : GET
// @description : Get all articles
exports.getArticles = asyncHandler(async (req, res, next) => {
	const articles = await Article.find({ isAuthentic: true })
		.sort({ _id: -1 })
		.limit(10);
	articles.forEach((article) => {
		if (article.showName === false) {
			article.author.name = "AITian";
			article.author.contact = "anonymous@aitpune.edu.in";
		}
	});
	return res.status(200).json({
		success: true,
		count: articles.length,
		articles,
	});
});

// @route : /api/v1/article/:article
// @req-type : GET
// @description : Get single article detail by article id
exports.getArticle = asyncHandler(async (req, res, next) => {
	const article = await Article.find({
		_id: req.params.articleId,
		isAuthentic: true,
	});
	if (article.length === 0)
		return next(
			new ErrorResponse(`No article with ${req.params.articleId} found !!`, 404)
		);
	article.forEach((article) => {
		if (article.showName === false) {
			article.author.name = "AITian";
			article.author.contact = "anonymous@aitpune.edu.in";
		}
	});
	return res.status(200).json({
		success: true,
		article,
	});
});

// @route : /api/v1/article/getAllCompanies
// @req-type : GET
// @description : Get all companies articles
exports.getAllCompanies = asyncHandler(async (req, res, next) => {
	// await sendMail();
	console.log("getAllCompanies");
	const allCompanies = await Article.find({ isAuthentic: true }).sort({
		companyName: 1,
	});
	const data = [];
	allCompanies.forEach((article) => {
		let company = article.companyName;
		let domainName = article.companyDomainName;
		let isCompanyFound = false;
		for (let d of data) {
			if (d.company === company) {
				isCompanyFound = true;
				d.count++;
			}
		}
		if (!isCompanyFound) {
			data.push({
				company,
				domainName,
				count: 1,
			});
		}
	});

	return res.status(200).json({
		success: true,
		data,
	});
});

// @route : /api/v1/article/company/:companyName
// @req-type : GET
// @description : Get single article detail by companyName
exports.getCompanyArticles = asyncHandler(async (req, res, next) => {
	const articles = await Article.find({
		companyName: req.params.companyName,
		isAuthentic: true,
	}).sort({ _id: -1 });
	articles.forEach((article) => {
		if (article.showName === false) {
			article.author.name = "AITian";
			article.author.contact = "anonymous@aitpune.edu.in";
		}
	});
	return res.status(200).json({
		success: true,
		articles,
	});
});

exports.authenticateArticle = asyncHandler(async (req, res, next) => {
	console.log("Came here at article authentication");
	const articleId = cryptr.decrypt(req.params.encryptedString);
	const articleDetails = await Article.findById(articleId);
	if (articleDetails.isAuthentic === true) {
		return res.status(400).json({
			success: false,
			message: "Article is already approved !",
		});
	}
	await Article.findByIdAndUpdate(articleId, { isAuthentic: true });
	// Notification to Sahara Backend
	console.log("Came here at article authentication");
	let notiMessage = "";
	try {
		const noti_response = await fetch(process.env.NOTIFICATION_URL, {
			method: "POST",
			body: JSON.stringify(articleDetails),
			headers: {
				"Content-type": "application/json",
				Authorization: `Bearer ${process.env.NOTIFICATION_TOKEN}`,
			},
		});
		// console.log(noti_response, articleDetails);
		if (noti_response.status === 200) {
			notiMessage = `Notification sent successfully!`;
		}
	} catch (error) {
		console.log(error);
		notiMessage = `Notification failed! - ${error}`;
	}
	console.log("author--", articleDetails.author.contact);

	// send Mail to the author
	try {
		await transporter.sendMail({
			from: process.env.EMAIL_ID, // sender address
			to: [articleDetails.author.contact], // list of receivers
			subject: `Community - ${articleDetails.title} - Article Approved`, // Subject line
			html: `
            <html>
                <head></head>
                <body>
                    <div>
                        <h3>Your article has been published on <a href="${process.env.FRONT_LINK}">Community</a>.</h3>
                        <p>You can view your article by clicking <a href="${process.env.FRONT_LINK}/article/${articleDetails._id}">here</a></p>
                    </div>
                <body>
            </html>
            `,
		});

		res.status(200).json({
			success: true,
			message: `Article  approved successfully, and notification mail sent!`,
			notification: notiMessage,
		});
	} catch (err) {
		res.status(200).json({
			success: true,
			message: `Article approved successfully, but there was some problem in sending approval notification mail to the author.`,
			notification: notiMessage,
		});
	}
});

// @route : /api/v1/article/tags
// @req-type : POST
// @description : Get articles detail by tags
exports.getArticlesByTag = asyncHandler(async (req, res, next) => {
	const tags = req.body.tags;
	const article = await Article.find({
		$and: [{ isAuthentic: true }, { articleTags: { $in: tags } }],
	});
	return res.status(200).json({
		success: true,
		article,
	});
});

const sendMail = async (body, encryptedString) => {
	const parsedHTML = htmlToText(body.description, {
		wordwrap: 130,
	});
	// send mail with defined transport object
	const htmlTemplate = await generateMailBody("mail");
	const params = {
		body,
		parsedHTML,
		encryptedString,
		base_link:"https://csea-interview-exp-server.vercel.app" ,
	};
	const html = compileTemplate(htmlTemplate, params);
	await transporter.sendMail({
		from: '"Community"', // sender address
		to: [process.env.VERIFY_MAIL], // list of receivers
		subject: `Community - ${body.title}`, // Subject line
		html,
	});
};
