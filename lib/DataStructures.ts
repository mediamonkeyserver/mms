
declare namespace MediaMonkeyServer{
	
	interface User {
		_id: string,
		name: string,
		display_name: string,
		password: string,
		role_key: string,
		role: Role,
	}
	
	interface Role {
		key: string,
		label: string,
		access_level: number,
	}
	
	interface Collection { 
		id: number,
		name: string,
		folders: Array<string>,
		type: string,
	}
	
	//better-sqlite3 RunResult
	interface RunResult {
		changes: number,
		lastInsertRowid: Integer.IntLike,
	}
	
	interface Metas {
		// file/item properties
		db_id: number,
		sync_id: string,
		path: string,
		mimeType: string,
		// upnp:* and dc:* properties:
		title: string,
		album: string,
		artists: Array<string>,
		albumArtists: Array<string>,
		actors: Array<string>,
		authors: Array<string>,
		producers: Array<string>,
		directors: Array<string>,
		publishers: Array<string>,
		genres: Array<string>,
		year: number,
		originalTrackNumber: number,
		originalDiscNumber: number,
		duration: number,
		rating: number,
		ratings: Array<Rating>,
		comment: string,
		lyrics: string,
		// res@* properties:
		size: number,
		/* 
			TODO?: keep resource/format data in DB, they should served based on purpose (auto-converted to various supported formats)
			metas.bitrate = row.bitrate;
			metas.sampleFrequency = row.samplerate;
			metas.bitsPerSample = row.bitsPerSample;
			metas.nrAudioChannels = row.channels;
			metas.resolution = row.resolution;
			metas.framerate = row.framerate;
		*/
		// unofficial properties
		playcount: number,
		skipcount: number,
		bookmark: number,
		bpm: number,
		volumeLeveling: number,
		volumeLevelTrack: number,
		volumeLevelAlbum: number,
		last_time_played: string,
		parental_rating: string,
		grouping: string,
		tempo: string,
		mood: string,
		occasion: string,
		quality: string,
		isrc: string,
		initialKey: string,
		conductors: Array<string>,
		contributors: Array<string>,
		lyricists: Array<string>,
		originalTitle: string,
		originalArtist: string,
		originalLyricist: string,
		originalDate: number,
		encoder: string,
		copyright: string,
		subtitle: string,
		custom1: string,
		custom2: string,
		custom3: string,
		custom4: string,
		custom5: string,
		custom6: string,
		custom7: string,
		custom8: string,
		custom9: string,
		custom10: string,
		albumArts: Array<AlbumArt> | undefined,
	}
	
	interface Rating{
		rating: number,
		type: string,
	}
	
	interface AlbumArt {
		contentHandlerKey: string,
		mimeType: string,
		size: number | undefined,
		hash: string | undefined,
		key: number,
		path: string | undefined,
	}
}

export = MediaMonkeyServer;


// == all of this is pasted in for Integer.IntLike ==

// Type definitions for integer 1.0
// Project: https://github.com/JoshuaWise/integer#readme
// Definitions by: Ben Davies <https://github.com/Morfent>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
declare function Integer(val: Integer.IntLike): Integer.IntClass;

declare namespace Integer {
    type IntLike = number | string | IntClass;

    function fromBits(low: number, high?: number): IntClass;
    function fromNumber(val: number, defaultVal?: number | IntClass): IntClass;
    function fromString(val: string, radix?: number, defaultVal?: string | IntClass): IntClass;
    function isInstance(val: any): boolean;

    const MAX_VALUE: IntClass;
    const MIN_VALUE: IntClass;
    const ZERO: IntClass;
    const ONE: IntClass;
    const NEG_ONE: IntClass;

    class IntClass {
        low: number;
        high: number;
        constructor(val: IntLike);

        add(augend: IntLike): IntClass;
        plus(augend: IntLike): IntClass;

        sub(subtrahend: IntLike): IntClass;
        subtract(subtrahend: IntLike): IntClass;
        minus(subtrahend: IntLike): IntClass;

        mul(multiplier: IntLike): IntClass;
        multiply(multiplier: IntLike): IntClass;
        times(multiplier: IntLike): IntClass;

        div(divisor: IntLike): IntClass;
        divide(divisor: IntLike): IntClass;
        divideBy(divisor: IntLike): IntClass;
        dividedBy(divisor: IntLike): IntClass;
        over(divisor: IntLike): IntClass;

        mod(divisor: IntLike): IntClass;
        modulo(divisor: IntLike): IntClass;

        neg(): IntClass;
        negate(): IntClass;

        abs(): IntClass;
        absoluteValue(): IntClass;

        and(bits: IntLike): IntClass;
        or(bits: IntLike): IntClass;
        xor(bits: IntLike): IntClass;
        not(): IntClass;

        shl(bits: number): IntClass;
        shiftLeft(bits: number): IntClass;
        shr(bits: number): IntClass;
        shiftRight(bits: number): IntClass;

        eq(val: IntLike): boolean;
        equals(val: IntLike): boolean;
        isEqualTo(val: IntLike): boolean;

        neq(val: IntLike): boolean;
        notEquals(val: IntLike): boolean;
        isNotEqualTo(val: IntLike): boolean;
        doesNotEqual(val: IntLike): boolean;

        gt(val: IntLike): boolean;
        greaterThan(val: IntLike): boolean;
        isGreaterThan(val: IntLike): boolean;
        gte(val: IntLike): boolean;
        greaterThanOrEquals(val: IntLike): boolean;
        isGreaterThanOrEqualTo(val: IntLike): boolean;

        lt(val: IntLike): boolean;
        lessThan(val: IntLike): boolean;
        isLessThan(val: IntLike): boolean;
        lte(val: IntLike): boolean;
        lessThanOrEquals(val: IntLike): boolean;
        isLessThanOrEqualTo(val: IntLike): boolean;

        compare(val: IntLike): -1 | 0 | 1;

        bitSizeAbs(): number;

        isEven(): boolean;
        isOdd(): boolean;
        isPositive(): boolean;
        isNegative(): boolean;
        isZero(): boolean;
        isNonZero(): boolean;
        isNotZero(): boolean;
        isSafe(): boolean;
        isUnsafe(): boolean;

        toNumber(): number;
        toNumberUnsafe(): number;
        toString(radix?: number): string;
        valueOf(): number;
    }
}