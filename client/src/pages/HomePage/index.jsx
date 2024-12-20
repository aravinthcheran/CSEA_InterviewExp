import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ArticleCard from "../../Component/ArticleCard";
import Carousel from "react-bootstrap/Carousel";
import Loading from "../../Component/Loading";
import "./index.scss";
import { apiUrl } from "../../constants";

import headerImageFirst from "../../assets/frame_1.svg";
import headerImageSecond from "../../assets/frame_2.svg";
import headerImageThird from "../../assets/frame_3.svg";

const HomePage = () => {
	const [companyList, setCompanyList] = useState([]);
	const [recentArticles, setRecentArticles] = useState([]);
	const [loading, setLoading] = useState(true);
	const loadData = useCallback(() => {
		const apiUrl_companyList = `${apiUrl}/api/v1/article/getAllCompanies`;
		const apiUrl_allArticle = `${apiUrl}/api/v1/article`;

		// Retrieve token from local storage
		const jsonString = localStorage.getItem("user");
		if (jsonString) {
			console.log("jsonString", jsonString);
			const data = JSON.parse(jsonString);

			// Create headers object with Authorization header
			const headers = {
				authorization: `Bearer ${data.token}`,
			};
			const axiosConfig = {
				headers: headers,
			};
			axios
				.all([
					axios.get(apiUrl_companyList, axiosConfig), // Pass axiosConfig object here
					axios.get(apiUrl_allArticle, axiosConfig), // Pass axiosConfig object here
				])
				.then(
					axios.spread((res1, res2) => {
						setCompanyList(res1.data.data);
						setRecentArticles(res2.data.articles);
						setLoading(false);
						console.log("Response1", res1.data.data);
						console.log("Response2", res2.data.articles);
					})
				)
				.catch((error) => {
					// Handle errors
					console.error("Error loading data:", error);
				});
		}
	}, []);

	useEffect(() => {
		const jsonString = localStorage.getItem("user");
		// if (!jsonString) {
		// 	this.props.history.push("/login");
		// 	return;
		// }
		if (jsonString) {
			loadData();
		}
	}, [loadData]);

	// const replaceHTMLTags=(str)=>{
	//     str = str.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
	//     return str.replace(/<\/?[^>]+(>|$)/g, "")
	// }

	return (
		<div className="home-page-container container-fluid my-2 d-flex flex-column justify-content-between">
			<div className="d-flex flex-md-row flex-column m-0 p-0 mb-3">
				<div className="col-12 order-md-2 col-md-6  container d-flex flex-column justify-content-around">
					{/* <img src={headerImage} alt="Anubhav"/> */}
					<Carousel indicators={false}>
						<Carousel.Item className="carousel-item" interval={3000}>
							<img
								className="d-block w-100 mx-auto"
								src={headerImageFirst}
								alt="First slide"
							/>
						</Carousel.Item>
						<Carousel.Item className="carousel-item" interval={3000}>
							<img
								className="d-block w-100 mx-auto"
								src={headerImageSecond}
								alt="Third slide"
							/>
						</Carousel.Item>
						<Carousel.Item className="carousel-item" interval={3000}>
							<img
								className="d-block w-100 mx-auto"
								src={headerImageThird}
								alt="Third slide"
							/>
						</Carousel.Item>
					</Carousel>

					<p className="homepagePara mx-auto text-center">
						An experiance sharing platform for PSG Techians to share their
						various interviews and experiences by <b>CSEA</b>
						<br />
						{/* <Link to="/video" className="mt-3 btn btn-primary">
							<span className="d-flex align-items-center font-weight-bold">
								Watch Video{" "}
								<i
									className="fa fa-play-circle fa-2x px-1 py-0"
									aria-hidden="true"
								></i>
							</span>
						</Link> */}
					</p>
				</div>
				<div className="col-md-3 order-md-1 col-12 ">
					<div className="title-bar d-flex">
						<span className="title flex-grow-1 mb-2">Company List</span>
						{/* <Link to='/allCompany'>Show all</Link> */}
					</div>
					<ul className="list-group company-list">
						{loading ? (
							<div className="list-group-item d-flex justify-content-between align-items-center list-box">
								<Loading />
							</div>
						) : (
							companyList &&
							companyList.map((item, index) => {
								return (
									<Link
										key={index}
										to={`/interview/${item.company}`}
										className="list-group-item col-12 p-1 px-3 d-flex  justify-content-between align-items-center list-box my-1"
									>
										<div className="col-11">
											<img
												src={item.domainName}
												alt="logo"
												className="companyLogoImg rounded-circle"
											></img>
											{item.company}
										</div>
										<span className="col-1 badge badge-secondary badge-pill text-center">
											{item.count}
										</span>
									</Link>
								);
							})
						)}
					</ul>
				</div>
				<div className="col-3  order-md-3 hide-for-small ">
					<div className="title-bar d-flex">
						<span className="title flex-grow-1 mb-2">Recent Articles</span>
					</div>
					<ul className="list-group company-list recentArticleCards">
						{loading ? (
							<div className="list-group-item d-flex justify-content-between align-items-center list-box">
								<Loading />
							</div>
						) : (
							recentArticles &&
							recentArticles.map((item, index) => {
								return (
									<ArticleCard
										key={index}
										id={item._id}
										title={item.title}
										// description={replaceHTMLTags(item.description)}
										name={item.showName ? `${item.author.name}` : " AITian "}
										date={item.createdAt}
										tags={item.articleTags}
									/>
								);
							})
						)}
					</ul>
				</div>
			</div>
		</div>
	);
};

export default HomePage;
