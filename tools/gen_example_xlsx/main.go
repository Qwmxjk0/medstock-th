// gen_example_xlsx — สร้างไฟล์ตัวอย่าง xlsx สำหรับ initial data
// รัน: go run ./tools/gen_example_xlsx/
package main

import (
	"fmt"
	"os"

	"github.com/xuri/excelize/v2"
)

func main() {
	outPath := "example-opening-data.xlsx"
	if len(os.Args) > 1 {
		outPath = os.Args[1]
	}

	f := excelize.NewFile()

	createProductSheet(f)
	createOpeningStockSheet(f)
	createMasterSheet(f)

	// ลบ Sheet1 เริ่มต้น
	f.DeleteSheet("Sheet1")

	if err := f.SaveAs(outPath); err != nil {
		fmt.Println("Error:", err)
		os.Exit(1)
	}
	fmt.Println("สร้างไฟล์สำเร็จ:", outPath)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func setHeader(f *excelize.File, sheet string, headers []string, style int) {
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, style)
	}
}

func setRow(f *excelize.File, sheet string, row int, values []interface{}) {
	for i, v := range values {
		cell, _ := excelize.CoordinatesToCellName(i+1, row)
		f.SetCellValue(sheet, cell, v)
	}
}

func headerStyle(f *excelize.File) int {
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 10},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"1F4E79"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "FFFFFF", Style: 1},
			{Type: "right", Color: "FFFFFF", Style: 1},
		},
	})
	return style
}

func noteStyle(f *excelize.File) int {
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Color: "7F7F7F", Italic: true, Size: 9},
	})
	return style
}

func setColWidths(f *excelize.File, sheet string, widths map[string]float64) {
	for col, w := range widths {
		f.SetColWidth(sheet, col, col, w)
	}
}

// ─── Sheet 1: ทะเบียนเวชภัณฑ์ ──────────────────────────────────────────────

func createProductSheet(f *excelize.File) {
	sheet := "1_ทะเบียนเวชภัณฑ์"
	f.NewSheet(sheet)

	hStyle := headerStyle(f)
	headers := []string{
		"รหัสเวชภัณฑ์*", "ชื่อเวชภัณฑ์/รายการยา*", "กลุ่มยา/ประเภท",
		"หน่วยนับหลัก*", "หน่วยนับรับเข้า", "หน่วยนับเบิก",
		"ขนาดบรรจุ", "จุดสั่งซื้อขั้นต่ำ", "ราคาต่อหน่วย (บาท)",
	}
	setHeader(f, sheet, headers, hStyle)

	rows := [][]interface{}{
		{"MED001", "Paracetamol 500mg", "ยาทั่วไป", "เม็ด", "กล่อง", "เม็ด", 1000, 500, 0.50},
		{"MED002", "Amoxicillin 500mg", "ยาปฏิชีวนะ", "เม็ด", "กล่อง", "เม็ด", 100, 50, 3.50},
		{"MED003", "Normal Saline 0.9% 1000ml", "สารน้ำ", "ขวด", "ขวด", "ขวด", 1, 20, 45.00},
		{"MED004", "Ibuprofen 400mg", "ยาทั่วไป", "เม็ด", "กล่อง", "เม็ด", 100, 100, 2.00},
		{"MED005", "Chlorhexidine Solution 4%", "วัสดุสิ้นเปลือง", "ขวด", "ขวด", "ขวด", 1, 10, 85.00},
		{"MED006", "Surgical Gloves (M)", "วัสดุสิ้นเปลือง", "คู่", "กล่อง", "คู่", 100, 50, 8.00},
		{"MED007", "Omeprazole 20mg", "ยาทางเดินอาหาร", "เม็ด", "กล่อง", "เม็ด", 30, 30, 5.00},
		{"MED008", "Metformin 500mg", "ยาเบาหวาน", "เม็ด", "กล่อง", "เม็ด", 100, 60, 1.50},
		{"MED009", "Amlodipine 5mg", "ยาหัวใจ/ความดัน", "เม็ด", "กล่อง", "เม็ด", 30, 30, 4.00},
		{"MED010", "Gauze 4x4 (12 ply)", "วัสดุสิ้นเปลือง", "แผ่น", "กล่อง", "แผ่น", 100, 200, 1.20},
	}

	for i, r := range rows {
		setRow(f, sheet, i+2, r)
	}

	nStyle := noteStyle(f)
	f.SetCellValue(sheet, "A13", "หมายเหตุ: * = จำเป็นต้องกรอก | หน่วยนับต้องตรงกับที่บันทึกในระบบ (เมนู ข้อมูลพื้นฐาน > หน่วยนับ)")
	f.SetCellStyle(sheet, "A13", "A13", nStyle)

	setColWidths(f, sheet, map[string]float64{
		"A": 14, "B": 36, "C": 20, "D": 14, "E": 16, "F": 14, "G": 12, "H": 18, "I": 20,
	})
	f.SetRowHeight(sheet, 1, 22)
}

// ─── Sheet 2: ยอดยกมา (Opening Stock) ────────────────────────────────────────

func createOpeningStockSheet(f *excelize.File) {
	sheet := "2_ยอดยกมา(Opening)"
	f.NewSheet(sheet)

	hStyle := headerStyle(f)
	headers := []string{
		"รหัสเวชภัณฑ์*", "ชื่อเวชภัณฑ์", "Lot No.", "วันหมดอายุ (YYYY-MM-DD)",
		"จำนวนคงเหลือ*", "ราคาต่อหน่วย (บาท)", "บริษัท/ผู้จำหน่าย",
	}
	setHeader(f, sheet, headers, hStyle)

	rows := [][]interface{}{
		{"MED001", "Paracetamol 500mg", "LOT2401", "2026-01-31", 2000, 0.50, "บ.ยาไทย จำกัด"},
		{"MED001", "Paracetamol 500mg", "LOT2402", "2026-06-30", 3500, 0.50, "บ.ยาไทย จำกัด"},
		{"MED002", "Amoxicillin 500mg", "LOT2403", "2025-12-31", 200, 3.50, "บ.เภสัชกรรม จำกัด"},
		{"MED003", "Normal Saline 0.9% 1000ml", "LOT2404", "2026-03-31", 80, 45.00, "บ.เมดิคัล จำกัด"},
		{"MED004", "Ibuprofen 400mg", "LOT2405", "2026-08-31", 500, 2.00, "บ.ยาไทย จำกัด"},
		{"MED005", "Chlorhexidine Solution 4%", "LOT2406", "2025-11-30", 25, 85.00, "บ.เมดิคัล จำกัด"},
		{"MED006", "Surgical Gloves (M)", "LOT2407", "", 300, 8.00, "บ.อุปกรณ์การแพทย์ จำกัด"},
		{"MED007", "Omeprazole 20mg", "LOT2408", "2026-05-31", 150, 5.00, "บ.เภสัชกรรม จำกัด"},
		{"MED008", "Metformin 500mg", "LOT2409", "2026-07-31", 600, 1.50, "บ.ยาไทย จำกัด"},
		{"MED009", "Amlodipine 5mg", "LOT2410", "2026-09-30", 120, 4.00, "บ.เภสัชกรรม จำกัด"},
		{"MED010", "Gauze 4x4 (12 ply)", "LOT2411", "", 800, 1.20, "บ.อุปกรณ์การแพทย์ จำกัด"},
	}

	for i, r := range rows {
		setRow(f, sheet, i+2, r)
	}

	nStyle := noteStyle(f)
	notes := []string{
		"",
		"วิธีนำเข้าระบบ:",
		"1. เปิด MedStock → เมนู รับสินค้า → สร้างใบรับสินค้า",
		"2. เลือกบริษัท = 'ไม่ระบุ/รอตรวจสอบ' (หรือบริษัทที่ต้องการ)",
		"3. เพิ่มรายการตามตารางนี้ทีละแถว (รหัส + Lot + วันหมดอายุ + จำนวน + ราคา)",
		"4. กด 'ยืนยันรับสินค้า' — ระบบจะบันทึกเป็น Opening Stock",
	}
	for i, n := range notes {
		cell, _ := excelize.CoordinatesToCellName(1, 14+i)
		f.SetCellValue(sheet, cell, n)
		f.SetCellStyle(sheet, cell, cell, nStyle)
	}

	setColWidths(f, sheet, map[string]float64{
		"A": 16, "B": 36, "C": 14, "D": 24, "E": 18, "F": 22, "G": 28,
	})
	f.SetRowHeight(sheet, 1, 22)
}

// ─── Sheet 3: ข้อมูล Master Reference ────────────────────────────────────────

func createMasterSheet(f *excelize.File) {
	sheet := "3_ข้อมูลอ้างอิง"
	f.NewSheet(sheet)

	hStyle := headerStyle(f)
	nStyle := noteStyle(f)

	// หน่วยนับ
	f.SetCellValue(sheet, "A1", "หน่วยนับ (ต้องสร้างในระบบก่อน)")
	f.SetCellStyle(sheet, "A1", "A1", hStyle)
	units := []string{"เม็ด", "ขวด", "ซอง", "กล่อง", "ชิ้น", "แผง", "หลอด", "ถุง", "คู่", "แผ่น", "โหล"}
	for i, u := range units {
		cell, _ := excelize.CoordinatesToCellName(1, i+2)
		f.SetCellValue(sheet, cell, u)
	}

	// กลุ่มยา
	f.SetCellValue(sheet, "C1", "กลุ่มยา/ประเภทเวชภัณฑ์")
	f.SetCellStyle(sheet, "C1", "C1", hStyle)
	cats := []string{
		"ยาทั่วไป", "ยาปฏิชีวนะ", "ยาหัวใจ/ความดัน", "ยาเบาหวาน",
		"ยาทางเดินอาหาร", "สารน้ำ", "วัสดุสิ้นเปลือง", "ยาชา/ยาระงับความรู้สึก",
	}
	for i, c := range cats {
		cell, _ := excelize.CoordinatesToCellName(3, i+2)
		f.SetCellValue(sheet, cell, c)
	}

	// หน่วยงาน
	f.SetCellValue(sheet, "E1", "หน่วยงาน/แผนก")
	f.SetCellStyle(sheet, "E1", "E1", hStyle)
	depts := []string{
		"ห้องฉุกเฉิน", "ผู้ป่วยนอก", "ผู้ป่วยใน", "ห้องผ่าตัด",
		"ห้องคลอด", "ไอซียู", "กุมารเวชกรรม", "อายุรกรรม",
	}
	for i, d := range depts {
		cell, _ := excelize.CoordinatesToCellName(5, i+2)
		f.SetCellValue(sheet, cell, d)
	}

	// บริษัท
	f.SetCellValue(sheet, "G1", "บริษัท/ผู้จำหน่าย")
	f.SetCellStyle(sheet, "G1", "G1", hStyle)
	sups := []string{
		"บ.ยาไทย จำกัด", "บ.เภสัชกรรม จำกัด",
		"บ.เมดิคัล จำกัด", "บ.อุปกรณ์การแพทย์ จำกัด",
	}
	for i, s := range sups {
		cell, _ := excelize.CoordinatesToCellName(7, i+2)
		f.SetCellValue(sheet, cell, s)
	}

	f.SetCellValue(sheet, "A14", "* ข้อมูลเหล่านี้ต้องบันทึกในเมนู ข้อมูลพื้นฐาน ก่อนเริ่มใช้งาน")
	f.SetCellStyle(sheet, "A14", "A14", nStyle)

	setColWidths(f, sheet, map[string]float64{
		"A": 16, "B": 4, "C": 28, "D": 4, "E": 22, "F": 4, "G": 30,
	})
	f.SetRowHeight(sheet, 1, 22)
}
