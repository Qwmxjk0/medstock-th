package main

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
)

func main() {
	const size = 1024
	img := image.NewRGBA(image.Rect(0, 0, size, size))

	cx, cy := float64(size/2), float64(size/2)
	radius := float64(200)

	// Background gradient
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			fx, fy := float64(x), float64(y)
			dx := math.Max(0, math.Abs(fx-cx)-cx+radius)
			dy := math.Max(0, math.Abs(fy-cy)-cy+radius)
			if dx*dx+dy*dy <= radius*radius {
				t := (fx/float64(size) + fy/float64(size)) / 2
				r := uint8(0x1d + t*(0x0e-0x1d))
				g := uint8(0x4e + t*(0xa5-0x4e))
				b := uint8(0xd8 + t*(0xe9-0xd8))
				img.SetRGBA(x, y, color.RGBA{r, g, b, 255})
			}
		}
	}

	// M as a single polygon (12-point shape)
	// Coordinates: padding ~160px each side
	pad := 160.0
	sw := 95.0 // stroke width
	top := pad
	bot := float64(size) - pad
	mid := float64(size)/2 + 30 // valley depth
	lft := pad
	rgt := float64(size) - pad

	// 12 vertices of letter M (clockwise from top-left outer)
	poly := [][2]float64{
		{lft, top},              // 0: top-left outer
		{lft + sw, top},         // 1: top-left inner
		{float64(size) / 2, mid - sw*0.4}, // 2: valley inner-top
		{rgt - sw, top},         // 3: top-right inner
		{rgt, top},              // 4: top-right outer
		{rgt, bot},              // 5: bottom-right outer
		{rgt - sw, bot},         // 6: bottom-right inner
		{rgt - sw, top + sw*1.4},// 7: right leg inner-bottom
		{float64(size) / 2, mid + sw*0.6}, // 8: valley outer-bottom
		{lft + sw, top + sw*1.4},// 9: left leg inner-bottom
		{lft + sw, bot},         // 10: bottom-left inner
		{lft, bot},              // 11: bottom-left outer
	}

	white := color.RGBA{255, 255, 255, 255}
	fillPolygon(img, poly, white)

	out, _ := os.Create(os.Args[1])
	defer out.Close()
	png.Encode(out, img)
}

func fillPolygon(img *image.RGBA, poly [][2]float64, c color.RGBA) {
	bounds := img.Bounds()
	minY, maxY := bounds.Max.Y, bounds.Min.Y
	for _, p := range poly {
		y := int(p[1])
		if y < minY { minY = y }
		if y > maxY { maxY = y }
	}
	for y := minY; y <= maxY; y++ {
		var intersects []float64
		n := len(poly)
		for i := 0; i < n; i++ {
			j := (i + 1) % n
			yi, yj := poly[i][1], poly[j][1]
			if (yi <= float64(y) && yj > float64(y)) || (yj <= float64(y) && yi > float64(y)) {
				t := (float64(y) - yi) / (yj - yi)
				x := poly[i][0] + t*(poly[j][0]-poly[i][0])
				intersects = append(intersects, x)
			}
		}
		// Sort intersections
		for i := 0; i < len(intersects)-1; i++ {
			for j := i + 1; j < len(intersects); j++ {
				if intersects[j] < intersects[i] {
					intersects[i], intersects[j] = intersects[j], intersects[i]
				}
			}
		}
		for i := 0; i+1 < len(intersects); i += 2 {
			x0 := int(intersects[i])
			x1 := int(intersects[i+1])
			for x := x0; x <= x1; x++ {
				img.SetRGBA(x, y, c)
			}
		}
	}
}
