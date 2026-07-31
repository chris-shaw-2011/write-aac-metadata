# Write AAC Metadata

> **Warning: This package is no longer maintained.**
>
> `write-aac-metadata` is a wrapper around [`node-taglib-sharp`](https://www.npmjs.com/package/node-taglib-sharp), which provides the metadata-writing functionality directly. New and existing projects should use `node-taglib-sharp` instead. This package will remain available to avoid breaking existing installations, but no further updates are planned.

## Legacy documentation

## Installation
```sh
npm install write-aac-metadata --save
yarn add write-aac-metadata
```

## Usage
```javascript
import metadataWriter from "write-aac-metadata"

const writeMetadata = async () => {
   await metadataWriter("someFile.m4a", {title: "Some Title", description: "Description"}, "someFile-copy.m4a")
}

writeMetadata()
```

If you want to modify a file in place, don't pass anything to the third parameter. If you provide a different output path, the input file is copied there before its metadata is updated. This package preserves the original file timestamps.

## Metadata
Set whatever metadata you want updated. Any fields that are left as undefined will not be changed and the current value of the metadata will be copied to the output file

```typescript
{
   title?: string,
   artist?: string,
   albumArtist?: string,
   album?: string,
   grouping?: string,
   composer?: string,
   year?: number,
   trackNumber?: number,
   comment?: string,
   genre?: string,
   copyright?: string,
   description?: string,
   synopsis?: string,
   /**
    * The path for the cover photo that should be added to the file, don't set this field if you want to keep the existing art
    */
   coverPicturePath?: string,
}
```

## Options
These are the options you can pass as the 4th parameter

```typescript
{
   /**
    * Write debugging output to the console?
    * @default false
    */
   debug?: boolean,
   /**
    * Retained for backwards compatibility, but no longer has any effect.
    * @deprecated
    * @default false
    */
   pipeStdio?: boolean,
}
```
