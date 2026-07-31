import {
	ByteVector,
	File as TagLibFile,
	Mpeg4AppleTag,
	Mpeg4BoxHeader,
	Mpeg4IsoChunkLargeOffset,
	Mpeg4IsoChunkOffsetBox,
	Picture,
	ReadStyle,
	StringType,
	TagTypes,
} from "node-taglib-sharp"
import type Options from "./Options.js"
import DefaultOptions from "./DefaultOptions.js"
import type Metadata from "./Metadata.js"
import path from "path"
import fs from "fs"
import { utimes } from "utimes"

const longDescriptionBoxType = ByteVector.fromString("ldes", StringType.Latin1).makeReadOnly()

/*
 * node-taglib-sharp 6.0.3 validates MPEG-4 box size changes as unsigned values,
 * even though replacing metadata can legitimately shrink a box. Retain its
 * behavior while accepting signed changes in the affected internals.
 */
Mpeg4BoxHeader.prototype.overwrite = function (file: TagLibFile, sizeChange: number) {
	if (!Number.isSafeInteger(sizeChange)) {
		throw new Error("Argument out of range: sizeChange must be a safe JS integer")
	}

	if (Reflect.get(this, "_fromDisk") !== true) {
		throw new Error("Cannot overwrite headers not on disk.")
	}

	const position: unknown = Reflect.get(this, "_position")
	const oldHeaderSize = this.headerSize

	if (typeof position !== "number" || !Number.isSafeInteger(position)) {
		throw new Error("Invalid MPEG-4 box header position")
	}

	this.dataSize += sizeChange
	file.insert(this.render(), position, oldHeaderSize)

	return sizeChange + this.headerSize - oldHeaderSize
}

function updateMpeg4ChunkOffsets(box: Mpeg4IsoChunkOffsetBox | Mpeg4IsoChunkLargeOffset, sizeDifference: number, after: number) {
	if (!Number.isSafeInteger(sizeDifference)) {
		throw new Error("Argument out of range: sizeDifference must be a safe JS integer")
	}
	if (!Number.isSafeInteger(after) || after < 0) {
		throw new Error("Argument out of range: after must be a safe, positive JS integer")
	}

	const offsetTable: unknown = Reflect.get(box, "_offsetTable")

	if (!Array.isArray(offsetTable) || !offsetTable.every(offset => typeof offset === "number")) {
		throw new Error("Invalid MPEG-4 chunk offset table")
	}

	for (let i = 0; i < offsetTable.length; i++) {
		if (offsetTable[i] >= after) {
			offsetTable[i] += sizeDifference
		}
	}
}

Mpeg4IsoChunkOffsetBox.prototype.updatePositions = function (sizeDifference: number, after: number) {
	updateMpeg4ChunkOffsets(this, sizeDifference, after)
}

Mpeg4IsoChunkLargeOffset.prototype.updatePosition = function (sizeDifference: number, after: number) {
	updateMpeg4ChunkOffsets(this, sizeDifference, after)
}

function applyMetadata(tag: Mpeg4AppleTag, metadata: Metadata) {
	if (metadata.album !== undefined) {
		tag.album = metadata.album
	}
	if (metadata.artist !== undefined) {
		tag.performers = [metadata.artist]
	}
	if (metadata.albumArtist !== undefined) {
		tag.albumArtists = [metadata.albumArtist]
	}
	if (metadata.grouping !== undefined) {
		tag.grouping = metadata.grouping
	}
	if (metadata.composer !== undefined) {
		tag.composers = [metadata.composer]
	}
	if (metadata.year !== undefined) {
		tag.year = metadata.year
	}
	if (metadata.trackNumber !== undefined) {
		tag.track = metadata.trackNumber
	}
	if (metadata.comment !== undefined) {
		tag.comment = metadata.comment
	}
	if (metadata.genre !== undefined) {
		tag.genres = [metadata.genre]
	}
	if (metadata.copyright !== undefined) {
		tag.copyright = metadata.copyright
	}
	if (metadata.description !== undefined) {
		tag.description = metadata.description
	}
	if (metadata.synopsis !== undefined) {
		tag.setQuickTimeString(longDescriptionBoxType, metadata.synopsis)
	}
	if (metadata.title !== undefined) {
		tag.title = metadata.title
	}
	if (metadata.coverPicturePath) {
		tag.pictures = [Picture.fromPath(metadata.coverPicturePath)]
	}
}

/**
 *
 * @param inputFilePath The fully qualified path to the file that will have its metadata changed
 * @param metadata The metadata to update, anything that's set to undefined will not be changed and the current value kept
 * @param outputFilePath The output name of the file, pass undefined or an empty string if you want to keep the file name the same
 * @param options
 */
export default async (inputFilePath: string, metadata: Metadata, outputFilePath?: string, options?: Options) => {
	const opt = { ...DefaultOptions, ...options }

	if (!fs.existsSync(inputFilePath)) {
		throw new Error(`${inputFilePath}: file does not exist`)
	}

	const destinationPath = outputFilePath === undefined || outputFilePath === "" ? inputFilePath : outputFilePath
	const inputPath = path.resolve(inputFilePath).toLowerCase()
	const outputPath = path.resolve(destinationPath).toLowerCase()
	const modifiesInput = inputPath === outputPath

	if (fs.existsSync(destinationPath) && !modifiesInput) {
		throw new Error(`${destinationPath}: file already exists`)
	}

	const inputFileStats = fs.statSync(inputFilePath)
	const btime = Math.round(inputFileStats.birthtimeMs)
	const atime = Math.round(inputFileStats.atimeMs)
	const mtime = Math.round(inputFileStats.mtimeMs)

	if (opt.debug) {
		// eslint-disable-next-line no-console
		console.debug("filePath:", inputFilePath)
		// eslint-disable-next-line no-console
		console.debug("outputFilePath:", destinationPath)
		// eslint-disable-next-line no-console
		console.debug("metadata:", metadata)
		// eslint-disable-next-line no-console
		console.debug("Applied Options:", opt)
	}

	if (!modifiesInput) {
		fs.copyFileSync(inputFilePath, destinationPath)
	}

	let file: TagLibFile | undefined

	try {
		file = TagLibFile.createFromPath(destinationPath, undefined, ReadStyle.None)
		const tag = file.getTag(TagTypes.Apple, true)

		if (!(tag instanceof Mpeg4AppleTag)) {
			throw new Error(`${destinationPath}: file does not contain a writable Apple MPEG-4 tag`)
		}

		applyMetadata(tag, metadata)
		file.save()
	}
	finally {
		file?.dispose()
	}

	if (opt.debug) {
		// eslint-disable-next-line no-console
		console.debug(`Updated metadata in ${destinationPath}`)
		// eslint-disable-next-line no-console
		console.debug(`Setting ${destinationPath} creation date: ${new Date(btime).toDateString()} (${btime}), accessed date: ${new Date(atime).toDateString()} (${atime}), modified date: ${new Date(mtime).toDateString()} (${mtime}) so it matches with the original file`)
	}

	await utimes(destinationPath, { btime, atime, mtime })
}
