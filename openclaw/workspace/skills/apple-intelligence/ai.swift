#!/usr/bin/env swift
// ai.swift - Apple Intelligence CLI Tool
// Usage: swift ai.swift <command> [options]
//
// Commands:
//   image <prompt>     - Generate AI image
//   check              - Check AI availability
//
// Examples:
//   swift ai.swift image "一只戴墨镜的猫"
//   swift ai.swift check

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

// MARK: - Image Generation
func generateImage(prompt: String, style: String? = nil, limit: Int = 1) -> String {
    let semaphore = DispatchSemaphore(value: 0)
    var result: Output? = nil
    
    // Use Task for async operations
    Task {
        do {
            // Parse style
            let imageStyle: ImagePlaygroundStyle
            switch style?.lowercased() {
            case "animation": imageStyle = .animation
            case "illustration": imageStyle = .illustration
            case "sketch": imageStyle = .sketch
            default: imageStyle = .illustration // Default to illustration
            }
            
            // Create concept
            let concept = ImagePlaygroundConcept.text(prompt)
            
            // Generate images
            let creator = try await ImageCreator()
            let images = creator.images(for: [concept], style: imageStyle, limit: limit)
            
            // Save images and collect paths
            var paths: [String] = []
            var index = 0
            for try await image in images {
                let tempDir = FileManager.default.temporaryDirectory
                let filename = "ai_image_\(Date().timeIntervalSince1970)_\(index).png"
                let url = tempDir.appendingPathComponent(filename)
                
                // Convert CGImage to PNG
                let cgImage = image.cgImage
                let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
                if let pngData = bitmapRep.representation(using: .png, properties: [:]) {
                    try pngData.write(to: url)
                    paths.append(url.path)
                }
                index += 1
            }
            
            result = Output(success: true, data: ["paths": paths, "count": paths.count], error: nil)
        } catch {
            result = Output(success: false, data: nil, error: error.localizedDescription)
        }
        semaphore.signal()
    }
    
    semaphore.wait()
    return result?.toJSON() ?? """
    {"success":false,"data":null,"error":"timeout"}
    """
}

// MARK: - Check Availability
func checkAvailability() -> String {
    let isAvailable = ImagePlaygroundViewController.isAvailable
    
    let info: [String: Any] = [
        "aiAvailable": isAvailable,
        "macOSVersion": ProcessInfo.processInfo.operatingSystemVersionString
    ]
    
    return Output(success: true, data: info, error: nil).toJSON()
}

// MARK: - Main
let arguments = Array(CommandLine.arguments.dropFirst())

guard !arguments.isEmpty else {
    print("""
    Apple Intelligence CLI Tool
    Usage: swift ai.swift <command> [options]
    
    Commands:
      image <prompt>     - Generate AI image
      check              - Check AI availability
    
    Examples:
      swift ai.swift image "一只戴墨镜的猫"
      swift ai.swift image "赛博朋克城市" illustration
      swift ai.swift check
    """)
    exit(0)
}

let command = arguments[0]
var output: String

switch command {
case "image":
    guard arguments.count > 1 else {
        print(Output(success: false, data: nil, error: "Missing prompt").toJSON())
        exit(1)
    }
    let prompt = arguments[1]
    let style = arguments.count > 2 ? arguments[2] : nil
    output = generateImage(prompt: prompt, style: style)
    
case "check":
    output = checkAvailability()
    
default:
    print(Output(success: false, data: nil, error: "Unknown command: \(command)").toJSON())
    exit(1)
}

print(output)
