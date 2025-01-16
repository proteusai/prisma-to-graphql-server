import { OptionalKind, MethodDeclarationStructure, Writers } from 'ts-morph';

import { DmmfDocument } from '../dmmf/document';
import { DMMF } from '../dmmf/types';
import { GeneratorOptions } from '../options';

export function generateCrudResolverClassMethodDeclaration_Server(
  action: DMMF.Action,
  mapping: DMMF.ModelMapping,
  dmmfDocument: DmmfDocument,
  generatorOptions: GeneratorOptions,
): OptionalKind<MethodDeclarationStructure> {
  return {
    name: action.name,
    isAsync: true,
    returnType: `Promise<${action.returnTSType}>`,
    // decorators: [
    //   {
    //     name: `TypeGraphQL.${action.operation}`,
    //     arguments: [
    //       `_returns => ${action.typeGraphQLType}`,
    //       Writers.object({
    //         nullable: `${!action.method.isRequired}`,
    //       }),
    //     ],
    //   },
    // ],
    parameters: [
      // object
      {
        name: "_",
        type: "any",
      },
      // args
      ...(!action.argsTypeName
        ? [
          {
            name: "args",
            type: "any",
          },
        ]
        : [
          {
            name: "{ args }",
            type: `{ args: ${action.argsTypeName} }`,
            // decorators: [
            //   {
            //     name: "TypeGraphQL.Args",
            //     arguments: generatorOptions.emitRedundantTypesInfo
            //       ? [`_type => ${action.argsTypeName}`]
            //       : [],
            //   },
            // ],
          },
      ]),
      // context
      {
        name: "ctx",
        // TODO: import custom `ContextType`
        type: "GraphQLContext",
        // decorators: [{ name: "TypeGraphQL.Ctx", arguments: [] }],
      },
      // info
      {
        name: "info",
        type: "GraphQLResolveInfo",
        // decorators: [{ name: "TypeGraphQL.Info", arguments: [] }],
      },
    ],
    statements:
      action.kind === DMMF.ModelAction.aggregate
        ? [
            /* ts */ ` return getPrismaFromContext(ctx).${mapping.collectionName}.${action.prismaMethod}({
              ...args,
              ...transformInfoIntoPrismaArgs(info),
            });`,
          ]
        : action.kind === DMMF.ModelAction.groupBy
          ? [
              /* ts */ ` const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);`,
              /* ts */ ` return getPrismaFromContext(ctx).${mapping.collectionName}.${action.prismaMethod}({
              ...args,
              ...Object.fromEntries(
                Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
              ),
            });`,
            ]
          : [
              /* ts */ ` const { _count } = transformInfoIntoPrismaArgs(info);
            return getPrismaFromContext(ctx).${mapping.collectionName}.${action.prismaMethod}({
              ...args,
              ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
            });`,
            ],
  };
}
