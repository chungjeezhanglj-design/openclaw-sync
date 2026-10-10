#!/usr/bin/env swift
// ai-app.swift - Apple Intelligence CLI Tool (Foreground Mode)
// This creates a minimal macOS app that shows the Image Playground UI
// Usage: swift ai-app.swift <prompt> [style]

import Foundation
import AppKit
import ImagePlayground

// MARK: - JSON Output Helper
struct Output {
    let success: Bool
    let data: Any?
    let error: String?
    
    func toJSON() -> String {
        let dict: [String: Any] = [
            "success": success,
            "data": data as Any,
            "error": error ?? ""
        ]
        if let jsonData = try? JSONSerialization.data(withJSONObject: dict, options: []),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            return jsonString
        }
        return """
        {"success":\(success),"data":null,"error":"\(error ?? "unknown")"}
        """
    }
}

// MARK: - Main App
class AppDelegate: NSObject, NSApplicationDelegate, ImagePlaygroundViewController.Delegate {
    var window: NSWindow!
    var result: Output?
    let semaphore = DispatchSemaphore(value: 0)
    var imagePaths: [String] = []
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create window
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 800, height: 600),
                         styleMask: [.titled, .closable, .miniaturizable, .resizable],
                         backing: .buffered, defer: false)
        window.title = "Apple Intelligence"
        window.makeKeyAndOrderFront(nil)
        
        // Create Image Playground view controller
        let vc = ImagePlaygroundViewController()
        vc.delegate = self
        window.contentViewController = vc
        
        // Show window
        NSApp.activate(ignoringOtherApps: true)
    }
    
    @objc func imagePlaygroundViewController(_ viewController: ImagePlaygroundViewController,
                                      didCreateImageAt url: URL) {
        imagePaths.append(url.path)
    }
    
    @objc func imagePlaygroundViewControllerDidCancel(_ viewController: ImagePlaygroundViewController) {
        if imagePaths.isEmpty {
            result = Output(success: false, data: nil, error: "User cancelled")
        } else {
            result = Output(success: true, data: ["paths": imagePaths, "count": imagePaths.count], error: nil)
        }
        semaphore.signal()
    }
}

// MARK: - Main
let arguments = Array(CommandLine.arguments.dropFirst())

guard !arguments.isEmpty else {
    print("""
    Apple Intelligence CLI Tool (Foreground Mode)
    Usage: swift ai-app.swift <prompt> [style]
    
    This will open a visible window with the Image Playground UI.
    
    Styles: animation, illustration, sketch
    
    Examples:
      swift ai-app.swift "一只戴墨镜的猫" illustration
    """)
    exit(0)
}

let prompt = arguments[0]
let style = arguments.count > 1 ? arguments[1] : nil

// Parse style
let imageStyle: ImagePlaygroundStyle
switch style?.lowercased() {
case "animation": imageStyle = .animation
case "illustration": imageStyle = .illustration
case "sketch": imageStyle = .sketch
default: imageStyle = .illustration
}

// Create app
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()

// Wait for result
delegate.semaphore.wait()

// Output result
print(delegate.result?.toJSON() ?? """
{"success":false,"data":null,"error":"timeout"}
""")
