import { createYoga } from 'graphql-yoga'
import { schema } from '../../lib/graphql/schema.ts'

// Build the schema is handled in lib/graphql/schema.ts

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  // Enable GraphiQL
  graphiql: {
    title: 'MTG Tournament GraphQL API',
    defaultQuery: `query Sample {
  summary {
    totalTournaments
    totalDecks
    totalCards
    totalDeckCards
  }
  cardsWithStats(limit: 3) {
    score
    inclusionRate
    card { cardName typeLine setName }
  }
}`
  }
})

// Handle all HTTP methods through Yoga
export async function GET (context: any) {
  return yoga(context.request)
}

export async function POST (context: any) {
  return yoga(context.request)
}

export async function OPTIONS (context: any) {
  return yoga(context.request)
}
