import ApolloClient from 'apollo-client';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import createApolloClient from '../lib/createApolloClient';
import { GetUserByEmail, GetUserByEmailVariables } from '../__generated__/GetUserByEmail';
import Maybe from 'graphql/tsutils/Maybe';
import logger from '../logger';

export interface IUser {
  email: string;
  status: 'ACTIVE' | 'GUEST' | 'INACTIVE';
}

export interface ISessionUser extends IUser {
  accessToken: string;
  refreshToken: string;
}

const getUser = (apolloClient: ApolloClient<NormalizedCacheObject>, email: string) =>
  apolloClient.query<GetUserByEmail, GetUserByEmailVariables>({
    query: gql`
      query GetUserByEmail($email: String!) {
        userByEmail(email: $email) {
          id
          email
          username
          firstName
          lastName
          status
        }
      }
    `,
    variables: {
      email,
    },
  });

const auth0Verify = async (
  accessToken: string,
  refreshToken: string,
  extraParams: object,
  profile: {
    emails: Array<{ value: string }>;
  },
  done: (error: Maybe<Error>, user?: ISessionUser) => void
) => {
  const apolloClient = createApolloClient(accessToken);

  try {
    logger.debug(`auth0Verify: getUser(${profile.emails[0].value})`);
    const response = await getUser(apolloClient, profile.emails[0].value);
    const {
      data: { userByEmail },
      errors,
    } = response;

    if (errors) {
      logger.error(errors);
      console.log(errors);
    }

    return done(null, {
      accessToken,
      refreshToken,
      email: profile.emails[0].value,
      status: userByEmail ? userByEmail.status : 'GUEST',
    });
  } catch (e) {
    logger.error(e);
    return done(e);
  }
};

export default auth0Verify;
