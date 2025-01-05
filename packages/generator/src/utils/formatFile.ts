import prettier from 'prettier'

// export const formatFile = (content: string): Promise<string> => {
//   return new Promise((res, rej) =>
//     prettier.resolveConfig(process.cwd()).then((options) => {
//       if (!options) {
//         res(content) // no prettier config was found, no need to format
//       }

//       try {
//         const formatted = prettier.format(content, {
//           ...options,
//           parser: 'typescript',
//         })

//         console.log('Formatted:', formatted)
//         res(formatted)
//       } catch (error) {
//         console.error('Error formatting file', error)
//         rej(error)
//       }
//     })
//   )
// }

export const formatFile = (content: string): string => {
  return prettier.format(content, {
    parser: 'typescript',
  });
}
