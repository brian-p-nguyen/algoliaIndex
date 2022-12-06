import { Storefront } from "@nacelle/storefront-sdk";
import algoliasearch from "algoliasearch";
import { config } from "dotenv";

config();

const storefrontClient = Storefront({
    storefrontEndpoint: process.env.STOREFRONT_ENDPOINT,
    token: process.env.STOREFRONT_TOKEN
});

const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_API_KEY
);

const PRODUCTS_QUERY = `
query allProducts($filter: ProductFilterInput) {
	allProducts(filter: $filter) {
		pageInfo {
			hasNextPage
			endCursor
		}
		edges {
			node {
				sourceEntryId
                nacelleEntryId
				productType
				content {
					title
					handle
					featuredMedia {
						src
					}
					options {
						values
					}
				}
				variants {
					price
				}
			}
		}
	}
}
`
const index = algoliaClient.initIndex('nacelle');
let lastNacelleEntryId = null;
let loop = true;
while(loop) {
    let queryResults;
    if (lastNacelleEntryId === null){
        queryResults = await storefrontClient.query({ query: PRODUCTS_QUERY });
    } else {
        queryResults = await storefrontClient.query({ query: PRODUCTS_QUERY, 
            variables: { filter: { after : `${lastNacelleEntryId}` } }
        });           
    }

    const products = queryResults.allProducts.edges.map(({ node }) => node);
    const productsToIndex = products.map((product) => {
        return {
            objectID: product.nacelleEntryId,   // Unique Identifier for Algolia
            ...product
        }
    })

    index.saveObjects(productsToIndex).catch((error) => console.log(error));

    if (queryResults.allProducts.pageInfo.hasNextPage) {
        lastNacelleEntryId = queryResults.allProducts.pageInfo.endCursor
    } else {
        loop = false
    }
};