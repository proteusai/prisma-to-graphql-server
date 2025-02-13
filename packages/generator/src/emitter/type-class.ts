import { GetAccessorDeclarationStructure, MethodDeclarationStructure, OptionalKind, Project, PropertyDeclarationStructure, SetAccessorDeclarationStructure, Writers } from 'ts-morph';
import { DMMF } from './dmmf/types';
import { DmmfDocument } from './dmmf/document';
import path from 'path';
import { inputsFolderName, outputsFolderName } from './config';
import { pascalCase } from './helpers';
import { generateArgsImports, generateCustomScalarsImport, generateEnumsImports, generateGraphQLScalarsImport, generateInputsImports, generateModelsImports, generateOutputsImports, generatePrismaNamespaceImport, generateTypeGraphQLImport } from './imports';
import { GeneratorOptions } from './options';

export function generateOutputTypeClassFromType(
  project: Project,
  dirPath: string,
  type: DMMF.OutputType,
  dmmfDocument: DmmfDocument,
) {
  const fileDirPath = path.resolve(dirPath, outputsFolderName);
  const filePath = path.resolve(fileDirPath, `${type.typeName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const fieldArgsTypeNames = type.fields
    .filter(it => it.argsTypeName)
    .map(it => it.argsTypeName!);
  const outputObjectTypes = type.fields.filter(
    field => field.outputType.location === "outputObjectTypes",
  );
  const outputObjectModelTypes = outputObjectTypes.filter(field =>
    dmmfDocument.isModelTypeName(field.outputType.type),
  );

//   generateTypeGraphQLImport(sourceFile);
  generateGraphQLScalarsImport(sourceFile);
//   generatePrismaNamespaceImport(sourceFile, dmmfDocument.options, 2);
  generateCustomScalarsImport(sourceFile, 2);
  generateArgsImports(sourceFile, fieldArgsTypeNames, 0);
  generateOutputsImports(
    sourceFile,
    outputObjectTypes
      .filter(field => !outputObjectModelTypes.includes(field))
      .map(field => field.outputType.type),
    1,
  );
  generateModelsImports(
    sourceFile,
    outputObjectModelTypes.map(field => field.outputType.type),
    1,
  );
  generateEnumsImports(
    sourceFile,
    type.fields
      .map(field => field.outputType)
      .filter(fieldType => fieldType.location === "enumTypes")
      .map(fieldType => fieldType.type),
    1,
  );

  sourceFile.addClass({
    name: type.typeName,
    isExported: true,
    // decorators: [
    //   {
    //     name: "TypeGraphQL.ObjectType",
    //     arguments: [
    //       `"${type.typeName}"`,
    //       Writers.object({
    //         ...(dmmfDocument.options.emitIsAbstract && {
    //           isAbstract: "true",
    //         }),
    //         ...(dmmfDocument.options.simpleResolvers && {
    //           simpleResolvers: "true",
    //         }),
    //       }),
    //     ],
    //   },
    // ],
    properties: [
      ...type.fields
        .filter(field => !field.argsTypeName)
        .map<OptionalKind<PropertyDeclarationStructure>>(field => ({
          name: field.name,
          type: field.fieldTSType,
          hasExclamationToken: true,
          hasQuestionToken: false,
          trailingTrivia: "\r\n",
        //   decorators: [
        //     {
        //       name: "TypeGraphQL.Field",
        //       arguments: [
        //         `_type => ${field.typeGraphQLType}`,
        //         Writers.object({
        //           nullable: `${!field.isRequired}`,
        //         }),
        //       ],
        //     },
        //   ],
        })),
      ...type.fields
        .filter(field => field.argsTypeName)
        .map<OptionalKind<PropertyDeclarationStructure>>(field => ({
          name: field.name,
          type: field.fieldTSType,
          hasExclamationToken: true,
          hasQuestionToken: false,
        })),
    ],
    methods: type.fields
      .filter(field => field.argsTypeName)
      .map<OptionalKind<MethodDeclarationStructure>>(field => ({
        name: `get${pascalCase(field.name)}`,
        returnType: field.fieldTSType,
        trailingTrivia: "\r\n",
        // decorators: [
        //   {
        //     name: "TypeGraphQL.Field",
        //     arguments: [
        //       `_type => ${field.typeGraphQLType}`,
        //       Writers.object({
        //         name: `"${field.name}"`,
        //         nullable: `${!field.isRequired}`,
        //       }),
        //     ],
        //   },
        // ],
        parameters: [
          {
            name: "root",
            type: type.typeName,
            decorators: [{ name: "TypeGraphQL.Root", arguments: [] }],
          },
          {
            name: "args",
            type: field.argsTypeName,
            decorators: [{ name: "TypeGraphQL.Args", arguments: [] }],
          },
        ],
        statements: [Writers.returnStatement(`root.${field.name}`)],
      })),
  });
}

export function generateInputTypeClassFromType(
  project: Project,
  dirPath: string,
  inputType: DMMF.InputType,
  options: GeneratorOptions,
) {
  const filePath = path.resolve(
    dirPath,
    inputsFolderName,
    `${inputType.typeName}.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateTypeGraphQLImport(sourceFile);
  generateGraphQLScalarsImport(sourceFile);
  generatePrismaNamespaceImport(sourceFile, options, 2);
  generateCustomScalarsImport(sourceFile, 2);
  generateInputsImports(
    sourceFile,
    inputType.fields
      .filter(field => field.selectedInputType.location === "inputObjectTypes")
      .map(field => field.selectedInputType.type)
      .filter(fieldType => fieldType !== inputType.typeName),
  );
  generateEnumsImports(
    sourceFile,
    inputType.fields
      .map(field => field.selectedInputType)
      .filter(fieldType => fieldType.location === "enumTypes")
      .map(fieldType => fieldType.type as string),
    1,
  );

  const fieldsToEmit = inputType.fields.filter(field => !field.isOmitted);
  const mappedFields = fieldsToEmit.filter(field => field.hasMappedName);

  sourceFile.addClass({
    name: inputType.typeName,
    isExported: true,
    decorators: [
      {
        name: "TypeGraphQL.InputType",
        arguments: [
          `"${inputType.typeName}"`,
          Writers.object({
            ...(options.emitIsAbstract && {
              isAbstract: "true",
            }),
          }),
        ],
      },
    ],
    properties: fieldsToEmit.map<OptionalKind<PropertyDeclarationStructure>>(
      field => {
        return {
          name: field.name,
          type: field.fieldTSType,
          hasExclamationToken: !!field.isRequired,
          hasQuestionToken: !field.isRequired,
          trailingTrivia: "\r\n",
          decorators: field.hasMappedName
            ? []
            : [
                {
                  name: "TypeGraphQL.Field",
                  arguments: [
                    `_type => ${field.typeGraphQLType}`,
                    Writers.object({
                      nullable: `${!field.isRequired}`,
                    }),
                  ],
                },
              ],
        };
      },
    ),
    getAccessors: mappedFields.map<
      OptionalKind<GetAccessorDeclarationStructure>
    >(field => {
      return {
        name: field.typeName,
        type: field.fieldTSType,
        hasExclamationToken: field.isRequired,
        hasQuestionToken: !field.isRequired,
        trailingTrivia: "\r\n",
        statements: [`return this.${field.name};`],
        decorators: [
          {
            name: "TypeGraphQL.Field",
            arguments: [
              `_type => ${field.typeGraphQLType}`,
              Writers.object({
                nullable: `${!field.isRequired}`,
              }),
            ],
          },
        ],
      };
    }),
    setAccessors: mappedFields.map<
      OptionalKind<SetAccessorDeclarationStructure>
    >(field => {
      return {
        name: field.typeName,
        type: field.fieldTSType,
        hasExclamationToken: field.isRequired,
        hasQuestionToken: !field.isRequired,
        trailingTrivia: "\r\n",
        parameters: [{ name: field.name, type: field.fieldTSType }],
        statements: [`this.${field.name} = ${field.name};`],
      };
    }),
  });
}