export default interface Options {
	/**
	 * Write debugging output to the console?
	 * @default false
	 */
	debug?: boolean,
	/**
	 * Retained for backwards compatibility. Metadata is now written in-process,
	 * so there is no child-process stdio to pipe.
	 * @deprecated This option no longer has any effect.
	 * @default false
	 */
	pipeStdio?: boolean,
}
