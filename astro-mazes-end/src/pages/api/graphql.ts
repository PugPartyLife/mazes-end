import { createYoga } from 'graphql-yoga'
import { builder } from '../../lib/graphql/schema.ts'

const yoga = createYoga({
  schema: builder.toSchema(),
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response }
})

export { yoga as ALL }