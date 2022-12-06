import { Storefront } from "@nacelle/storefront-sdk";
import algoliasearch from "algoliasearch";

const storefrontClient = Storefront({
    storefrontEndpoint: 'https://storefront.api.nacelle.com/graphql/v1/spaces/19816841-84ad-43a4-893f-2fa8fee942c7',
    token: '7efd7cf0-fca8-4f15-8b72-f2e2b0595be2'
});

const algoliaClient = algoliasearch(
    'JA0X9VKM96',
    '4c3a7c8889a2405c75960ad2492b00b1'
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