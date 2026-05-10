package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "MedStock",
		Width:            1440,
		Height:           900,
		MinWidth:         1024,
		MinHeight:        720,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
			// Handlers are bound at startup via app.Master/Product/Stock,
			// but Wails requires them listed here for code generation.
			// We use a deferred bind pattern via the app struct fields.
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
