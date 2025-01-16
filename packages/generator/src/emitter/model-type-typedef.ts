import { OptionalKind, Project, Writers, PropertyDeclarationStructure, GetAccessorDeclarationStructure, VariableDeclarationKind } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { DmmfDocument } from './dmmf/document';
import path from 'path';
import { modelsFolderName, resolversFolderName, typeDefsFolderName } from './config';
import { generateCustomScalarsImport, generateEnumsImports, generateGQLImport, generateGraphQLScalarsImport, generateModelsImports, generatePrismaNamespaceImport, generateResolversOutputsImports, generateTypeGraphQLImport } from './imports';
import { convertNewLines } from './helpers';



export function generateObjectTypeDefFromModel_GqlServer(
  project: Project,
  baseDirPath: string,
  model: DMMF.Model,
  modelOutputType: DMMF.OutputType,
  dmmfDocument: DmmfDocument,
) {
  const dirPath = path.resolve(baseDirPath, typeDefsFolderName, modelsFolderName);
  const filePath = path.resolve(dirPath, `${model.typeName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  generateGQLImport(sourceFile);

  sourceFile.addVariableStatement({
          // isExported: true,
          declarationKind: VariableDeclarationKind.Const,
          ...(model.docs && {
            docs: [{ description: `\n${convertNewLines(model.docs)}` }],
          }),
          declarations: [
            {
              name: model.typeName,
              // type: enumDef.values.map(({ name }) => `"${name}"`).join(" | "),
              initializer: `gql\`
  type ${model.typeName} {
    ${model.fields.map(({ name, type, isList, isRequired }) => `${name}: ${isList ? `[${type}]` : type}${isRequired ? '!' : ''}`).join("\n    ")}
  }
  \``,
            },
          ],
        });

        sourceFile.addExportAssignment({
            isExportEquals: false,
            expression: model.typeName,
        });
}
