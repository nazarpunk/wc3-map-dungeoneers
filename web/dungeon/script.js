// noinspection DuplicatedCode

class Random {
	constructor(seed) {
		this.m_w = seed;
		this.m_z = 987654321;
		this.mask = 0xffffffff;
	}

	next() {
		this.m_z = 36969 * (this.m_z & 65535) + (this.m_z >> 16) & this.mask;
		this.m_w = 18000 * (this.m_w & 65535) + (this.m_w >> 16) & this.mask;
		return ((this.m_z << 16) + this.m_w & this.mask) / 4294967296 + .5;
	}

	/**
	 * @param {number} min
	 * @param {number} max
	 * @return {number}
	 */
	int(min, max) {
		return Math.floor(this.next() * (max - min + 1) + min);
	}
}

const dungeonWidth = 220;
const dungeonHeight = 180;
const cellSize = 6;
const seed = Date.now();
//const seed = 1674773190194;
//console.log(seed);
const rand = new Random(seed);
const tiles = {
	EMPTY: 0,
	WALL: 1,
	FLOOR: 2
};
const map = [];
const connections = [];

class Room {
	/** @type {Bounds}*/ bounds;
	/** @type {Bounds}*/ size;
	depth = 0;
	/** @type {?Room}*/ left = null;
	/** @type {?Room}*/ right = null;
	/** @type {?Room}*/ parent = null;

	/**
	 * @param {Bounds} bounds
	 * @param {number} depth
	 * @param {?Room} left
	 * @param {?Room} right
	 * @param {?Room} parent
	 */
	constructor(bounds, depth, {
		left = null,
		right = null,
		parent = null,
	} = {}) {
		this.bounds = bounds;
		this.depth = depth;
		this.left = left;
		this.right = right;
		this.parent = parent;
	}

	split() {
		const vertical = rand.next() >= .5;
		const b = this.bounds;
		let ba, bb;
		const bx = .45;

		if (vertical) {
			ba = new Bounds(b.x, b.y, rand.int(1, b.w), b.h);
			bb = new Bounds(b.x + ba.w, b.y, b.w - ba.w, b.h);

			if (ba.w / ba.h < bx || bb.w / bb.h < bx) {
				return this.split();
			}
		} else {
			ba = new Bounds(b.x, b.y, b.w, rand.int(1, b.h));
			bb = new Bounds(b.x, b.y + ba.h, b.w, b.h - ba.h);

			if (ba.h / ba.w < bx || bb.h / bb.w < bx) {
				return this.split();
			}
		}

		const d = this.depth + 1;
		this.left = new Room(ba, d, {parent: this});
		this.right = new Room(bb, d, {parent: this});
	}

	/** @return {Room[]} */
	flat() {
		const flat = [];
		const stack = [];
		let room = this;

		while (stack.length > 0 || room !== null) {
			if (room !== null) {
				stack.push(room);
				room = room.left;
			} else {
				room = stack.pop();
				if (room.left === null && room.right === null) {
					flat.push(room);
				}
				room = room.right;
			}
		}

		return flat;
	}
}

class Bounds {
	x = 0;
	y = 0;
	w = 0;
	h = 0;

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	/**
	 * @param {Bounds} r
	 * @return {boolean}
	 */
	near(r) {
		const l = this;
		return l.x + l.w === r.x && (l.y <= r.y + r.h && l.y >= r.y || r.y <= l.y + l.h && r.y >= l.y) ||
			l.y + l.h === r.y && (l.x <= r.x + r.w && l.x >= r.x || r.x <= l.x + l.w && r.x >= l.x);
	}
}

//<editor-fold desc="generate">
const rootRoom = new Room(new Bounds(0, 0, dungeonWidth, dungeonHeight), 0);

const gStack = [rootRoom];
while (gStack.length > 0) {
	const r = gStack.pop();
	const b = r.bounds;
	if (Math.min(b.w, b.h) < 30) {
		continue;
	}
	r.split();
	gStack.push(r.left);
	gStack.push(r.right);
}

//</editor-fold>

//<editor-fold desc="connect">

const flatRooms = rootRoom.flat();
if (0) {
	for (let i = 0; i < flatRooms.length - 1; i++) {
		for (let k = i + 1; k < flatRooms.length; k++) {
			if (flatRooms[i].bounds.near(flatRooms[k].bounds)) {
				connections.push({
					left: flatRooms[i],
					right: flatRooms[k]
				});
			}
		}
	}
} else {
	const sStack = [rootRoom];
	while (sStack.length > 0) {
		const room = sStack.pop();
		if (room === null) {
			continue;
		}
		sStack.push(room.left);
		sStack.push(room.right);

		const lf = room.left === null ? [] : room.left.flat();
		const rf = room.right === null ? [] : room.right.flat();

		a:
			for (let i = 0; i < lf.length; i++) {
				const l = lf[i];
				for (let j = 0; j < rf.length; j++) {
					const r = rf[j];
					if (l.bounds.near(r.bounds)) {
						connections.push({
							left: l,
							right: r
						});
						break a;
					}
				}
			}
	}
}

//</editor-fold>

//<editor-fold desc="room size">
for (let i = 0; i < dungeonWidth * dungeonHeight; i++) {
	map[i] = tiles.EMPTY;
}

const rooms = rootRoom.flat();

for (let i = 0; i < rooms.length; i++) {
	const room = rooms[i];

	let x,y,w,h;
	const b = room.bounds;

	if (0) {
		x = b.x + rand.int(1, Math.floor(b.w / 3));
		y = b.y + rand.int(1, Math.floor(b.h / 3));
		w = b.w - (x - b.x);
		h = b.h - (y - b.y);
		w -= rand.int(1, w / 3);
		h -= rand.int(1, h / 3);
	} else {
		x = b.x + 1;
		y = b.y + 1;
		w = b.w - 2;
		h = b.h - 2;
	}

	for (let _y = y; _y < h + y; _y++) {
		for (let _x = x; _x < w + x; _x++) {
			map[_y * dungeonWidth + _x] = _x === x || _x === w + x - 1 ||
			_y === y || _y === h + y - 1 ? tiles.WALL : tiles.FLOOR;
		}
	}
	room.size = new Bounds(x, y, w, h);
}

//</editor-fold>

//<editor-fold desc="hall">
for (let i = 0; i < connections.length; i++) {
	const hall = connections[i];
	if (hall.left.bounds.x + hall.left.bounds.w === hall.right.bounds.x) {
		// Left/right
		if (hall.left.size.y + hall.left.size.h - 3 < hall.right.size.y ||
			hall.right.size.y + hall.right.size.h - 3 < hall.left.size.y) {
			// Z Corridor
			const pointL = hall.left.size.y + 1 + (rand.next() * (hall.left.size.h - 2) | 0);
			const pointR = hall.right.size.y + 1 + (rand.next() * (hall.right.size.h - 2) | 0);

			let diff, mid;
			if (hall.left.bounds.h >= hall.right.bounds.h) {
				diff = hall.left.bounds.x + hall.left.bounds.w - 1 - (hall.left.size.x + hall.left.size.w);
				mid = (rand.next() * diff | 0) + hall.left.size.x + hall.left.size.w - 1;
			} else {
				diff = hall.right.size.x - 1 - (hall.right.bounds.x + 1);
				mid = (rand.next() * diff | 0) + hall.right.bounds.x;
			}
			let x;

			for (x = hall.left.size.x + hall.left.size.w - 1; x <= mid; x++) {
				if (map[(pointL - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointL - 1) * dungeonWidth + x] = tiles.WALL;
				map[pointL * dungeonWidth + x] = tiles.FLOOR;
				if (map[(pointL + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointL + 1) * dungeonWidth + x] = tiles.WALL;
			}

			const lMin = Math.min(pointL - 1, pointR - 1);
			const lMax = Math.max(pointL + 1, pointR + 1);

			for (let y = lMin; y <= lMax; y++) {
				if (map[y * dungeonWidth + x - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + x - 1] = tiles.WALL;

				if (y !== lMin && y !== lMax)
					map[y * dungeonWidth + x] = tiles.FLOOR;
				else if (map[y * dungeonWidth + x] !== tiles.FLOOR)
					map[y * dungeonWidth + x] = tiles.WALL;

				if (map[y * dungeonWidth + x + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + x + 1] = tiles.WALL;
			}

			for (; x <= hall.right.size.x; x++) {
				if (map[(pointR - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointR - 1) * dungeonWidth + x] = tiles.WALL;
				map[pointR * dungeonWidth + x] = tiles.FLOOR;
				if (map[(pointR + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(pointR + 1) * dungeonWidth + x] = tiles.WALL;
			}
		} else {
			const t = Math.min(hall.left.size.y + hall.left.size.h, hall.right.size.y + hall.right.size.h);
			const b = Math.max(hall.left.size.y, hall.right.size.y);

			let diff = t - 1 - (b + 1);
			diff = rand.next() * diff | 0;
			const pos = b + diff + 1;

			let len = hall.right.size.x - (hall.left.size.x + hall.left.size.w - 1);
			for (let k = 0; k <= len; k++) {
				const _x = hall.left.size.x + hall.left.size.w - 1 + k;
				map[(pos - 1) * dungeonWidth + _x] = tiles.WALL;
				map[pos * dungeonWidth + _x] = tiles.FLOOR;
				map[(pos + 1) * dungeonWidth + _x] = tiles.WALL;
			}
		}
	} else {
		// Top/Bottom
		if (hall.left.size.x + hall.left.size.w - 3 < hall.right.size.x ||
			hall.right.size.x + hall.right.size.w - 3 < hall.left.size.x) {
			// Z Corridor
			const pointL = hall.left.size.x + 1 + (rand.next() * (hall.left.size.w - 2) | 0);
			const pointR = hall.right.size.x + 1 + (rand.next() * (hall.right.size.w - 2) | 0);

			let diff, mid;
			if (hall.left.bounds.w >= hall.right.bounds.w) {
				diff = (hall.left.bounds.y + hall.left.bounds.h) - (hall.left.size.y + hall.left.size.h);
				mid = (rand.next() * diff | 0) + hall.left.size.y + hall.left.size.h - 1;
			} else {
				diff = hall.right.size.y - 1 - (hall.right.bounds.y + 1);
				mid = (rand.next() * diff | 0) + hall.right.bounds.y;
			}

			let y;

			for (y = hall.left.size.y + hall.left.size.h - 1; y <= mid; y++) {
				if (map[y * dungeonWidth + pointL - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointL - 1] = tiles.WALL;
				map[y * dungeonWidth + pointL] = tiles.FLOOR;
				if (map[y * dungeonWidth + pointL + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointL + 1] = tiles.WALL;
			}

			const lMin = Math.min(pointL - 1, pointR - 1);
			const lMax = Math.max(pointL + 1, pointR + 1);

			for (let x = lMin; x <= lMax; x++) {
				if (map[(y - 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(y - 1) * dungeonWidth + x] = tiles.WALL;

				if (x !== lMin && x !== lMax)
					map[y * dungeonWidth + x] = tiles.FLOOR;
				else if (map[y * dungeonWidth + x] !== tiles.FLOOR)
					map[y * dungeonWidth + x] = tiles.WALL;

				if (map[(y + 1) * dungeonWidth + x] !== tiles.FLOOR)
					map[(y + 1) * dungeonWidth + x] = tiles.WALL;
			}

			for (; y <= hall.right.size.y; y++) {
				if (map[y * dungeonWidth + pointR - 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointR - 1] = tiles.WALL;
				map[y * dungeonWidth + pointR] = tiles.FLOOR;
				if (map[y * dungeonWidth + pointR + 1] !== tiles.FLOOR)
					map[y * dungeonWidth + pointR + 1] = tiles.WALL;
			}
		} else {
			const r = Math.min(hall.left.size.x + hall.left.size.w, hall.right.size.x + hall.right.size.w);
			const l = Math.max(hall.left.size.x, hall.right.size.x);

			let diff = r - 1 - (l + 1);
			diff = rand.next() * diff | 0;
			const pos = l + diff + 1;

			const len = hall.right.size.y - (hall.left.size.y + hall.left.size.h - 1);
			for (let k = 0; k <= len; k++) {
				const _y = hall.left.size.y + hall.left.size.h - 1 + k;
				map[_y * dungeonWidth + pos - 1] = tiles.WALL;
				map[_y * dungeonWidth + pos] = tiles.FLOOR;
				map[_y * dungeonWidth + pos + 1] = tiles.WALL;
			}
		}
	}
}
//</editor-fold>

//<editor-fold desc="canvas">
const canvas = document.createElement('canvas');
canvas.width = dungeonWidth * cellSize;
canvas.height = dungeonHeight * cellSize;
const ctx = canvas.getContext('2d');

// draw tile
for (let y = 0; y < dungeonHeight; y++) {
	for (let x = 0; x < dungeonWidth; x++) {
		const id = map[y * dungeonWidth + x];

		if (id === 0 || id === null) {
			continue;
		}

		if (id === tiles.WALL) {
			ctx.fillStyle = 'rgb(0,70,61)';
		} else if (id === tiles.FLOOR) {
			ctx.fillStyle = 'rgb(0,0,0)';
		}

		ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
	}
}

// draw connection
ctx.strokeStyle = 'rgb(255,0,0)';
ctx.beginPath();
for (let i = 0; i < connections.length; i++) {
	const item = connections[i];

	ctx.moveTo(
		(item.left.size.x + item.left.size.w * 0.5) * cellSize,
		(item.left.size.y + item.left.size.h * 0.5) * cellSize
	);
	ctx.lineTo(
		(item.right.size.x + item.right.size.w * 0.5) * cellSize,
		(item.right.size.y + item.right.size.h * 0.5) * cellSize
	);
}
ctx.stroke();

// draw grid
ctx.beginPath();
ctx.strokeStyle = "rgba(255,255,255,0.4)";
ctx.lineWidth = 0.5;

for (let i = 0; i <= dungeonWidth; i++) {
	ctx.moveTo(i * cellSize, 0);
	ctx.lineTo(i * cellSize, dungeonHeight * cellSize);
}
for (let i = 0; i <= dungeonHeight; i++) {
	ctx.moveTo(0, i * cellSize);
	ctx.lineTo(dungeonWidth * cellSize, i * cellSize)
}
ctx.stroke();
ctx.closePath();

// draw room bounds
ctx.strokeStyle = 'rgb(143,143,143)';
ctx.lineWidth = .5;
for (let i = 0; i < flatRooms.length; i++) {
	const lb = flatRooms[i].bounds;
	ctx.strokeRect(lb.x * cellSize, lb.y * cellSize, lb.w * cellSize, lb.h * cellSize);
}

document.body.appendChild(canvas);
//</editor-fold>

export {}