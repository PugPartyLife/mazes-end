import SchemaBuilder from '@pothos/core';
import DataloaderPlugin from '@pothos/plugin-dataloader';
import { createYoga } from 'graphql-yoga'
import { builder } from '../../lib/graphql/schema.ts'

// Build the schema
const schema = builder.toSchema()

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  // Enable GraphiQL
  graphiql: {
    title: 'MTG Tournament GraphQL API',
    defaultQuery: `query {
  summary {
    totalTournaments
    totalDecks
    totalCardEntries
    uniqueCards
  }
  
  topCards(limit: 5) {
    name
    totalEntries
    avgWinRate
  }
}`
  }
})

// Handle all HTTP methods through Yoga
export async function GET(context: any) {
  return yoga(context.request)
}

export async function POST(context: any) {
  return yoga(context.request)
}

export async function OPTIONS(context: any) {
  return yoga(context.request)
}