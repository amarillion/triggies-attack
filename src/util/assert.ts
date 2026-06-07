class AssertionError extends Error {

	constructor(msg: string) {
		super(msg);
	}

}

export function assert(test: unknown, msg = "") : asserts test {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (!test) {
		throw new AssertionError(msg);
	}
}
