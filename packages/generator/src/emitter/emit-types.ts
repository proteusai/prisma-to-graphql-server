import { SourceFile } from "ts-morph";
import {
    generateGraphQLSubscriptionsImport,
    generateGraphQLWebSocketImport,
    generatePrismaClientImport
} from "./imports";
import { GeneratorOptions } from "./options";

export function generateTypesFile_GqlServer(
  sourceFile: SourceFile,
  options: GeneratorOptions,
) {
    generatePrismaClientImport(sourceFile, options);
    generateGraphQLSubscriptionsImport(sourceFile);
    generateGraphQLWebSocketImport(sourceFile);

  sourceFile.addStatements(/* ts */ `
    export interface GraphQLContext {
        prisma?: PrismaClient | null;
        pubsub?: PubSub | null;
        session?: Session | null;
    }
  `);

  sourceFile.addStatements(/* ts */ `
    export interface Session<DateType = Date> {
        user?: User;
        expires: Date | DateType;
    }
  `);

  sourceFile.addStatements(/* ts */ `
    export interface User {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    }
  `);

  sourceFile.addStatements(/* ts */ `
    export interface SubscriptionContext extends Context {
        connectionParams: {
            req?: Request;
            session?: Session;
        }
    }
  `);
}
