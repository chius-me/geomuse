export type ResolvedByteRange =
  | {
      kind: "full";
    }
  | {
      kind: "partial";
      start: number;
      end: number;
    }
  | {
      kind: "unsatisfiable";
    };

export function resolveByteRange(
  rangeHeader: string | null,
  size: number,
): ResolvedByteRange {
  if (!rangeHeader) {
    return { kind: "full" };
  }

  if (
    !Number.isSafeInteger(size) ||
    size < 0 ||
    rangeHeader.includes(",")
  ) {
    return { kind: "unsatisfiable" };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(
    rangeHeader.trim(),
  );

  if (!match || (!match[1] && !match[2]) || size === 0) {
    return { kind: "unsatisfiable" };
  }

  if (!match[1]) {
    const suffixLength = Number(match[2]);

    if (
      !Number.isSafeInteger(suffixLength) ||
      suffixLength <= 0
    ) {
      return { kind: "unsatisfiable" };
    }

    return {
      kind: "partial",
      start: Math.max(0, size - suffixLength),
      end: size - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2]
    ? Number(match[2])
    : size - 1;

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    return { kind: "unsatisfiable" };
  }

  return {
    kind: "partial",
    start,
    end: Math.min(requestedEnd, size - 1),
  };
}
