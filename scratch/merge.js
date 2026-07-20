
const fs = require("fs");

let current = fs.readFileSync("app/tenant/page.tsx", "utf8");

// We need to replace the section starting with "{/* Balance Overview */}"
// up to the closing "</div>\n            )}" right before "{/* TAB: PROFILE"
const startIndex = current.indexOf("{/* Balance Overview */}");
const tabProfileIndex = current.indexOf("{/* TAB: PROFILE");

// Find the last "</div>\n            )}" before tabProfileIndex
const textBeforeProfile = current.substring(startIndex, tabProfileIndex);
const endOfForm = textBeforeProfile.lastIndexOf("</div>\n            )}");

if (startIndex !== -1 && endOfForm !== -1) {
  const prefix = current.substring(0, startIndex);
  const suffix = current.substring(startIndex + endOfForm + 28); // length of "</div>\n            )}"

  const replacementContent = `            {/* Balance Target Card */}
            <SoftCard className="bg-[#111111] dark:bg-white border-0 text-white dark:text-black">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-white/60 dark:text-black/50 font-medium mb-1">Balance Due</p>
                  <h2 className="text-4xl font-black">{formatCurrency(remaining)}</h2>
                </div>
                {remaining > 0 && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">PENDING</span>}
              </div>
              
              {remaining > 0 && (
                <div className="bg-white/10 dark:bg-black/5 p-5 rounded-[20px] mt-6">
                  <h3 className="font-bold mb-4 text-[15px] flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-[#58ff48]" />
                    Submit Payment Proof
                  </h3>
                  
                  <form onSubmit={handleUploadPayment} className="space-y-4">
                    {/* Payment Mode Toggle */}
                    <div className="flex bg-white/5 dark:bg-black/10 p-1 rounded-xl mb-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("UPI")}
                        className={\`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all \${
                          paymentMode === "UPI"
                            ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                            : "text-white/60 dark:text-black/60 hover:text-white dark:hover:text-black"
                        }\`}
                      >
                        Online (UPI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("CASH")}
                        className={\`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all \${
                          paymentMode === "CASH"
                            ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                            : "text-white/60 dark:text-black/60 hover:text-white dark:hover:text-black"
                        }\`}
                      >
                        Cash to Warden
                      </button>
                    </div>

                    {paymentMode === "UPI" ? (
                      /* Image Upload Area */
                      <div className="relative border-2 border-dashed border-white/20 dark:border-black/20 bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 rounded-[20px] p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors overflow-hidden group">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadFile(file);
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                        {previewUrl ? (
                          <div className="relative w-full h-40 rounded-xl overflow-hidden">
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Payment Proof Preview" />
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <UploadCloud className="w-8 h-8 text-white mb-2" />
                              <span className="text-white font-bold text-[13px]">Change Screenshot</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4">
                            <div className="w-12 h-12 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-6 h-6 text-[#58ff48] dark:text-[#1a8a10]" />
                            </div>
                            <p className="font-bold text-[14px] text-white dark:text-black">Upload Screenshot</p>
                            <p className="text-[12px] text-white/60 dark:text-black/60 mt-1">Tap to browse (JPG, PNG)</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-orange-500/10 dark:bg-orange-500/10 p-4 rounded-[16px] border border-orange-500/20 text-center">
                        <AlertCircle className="w-6 h-6 text-orange-400 dark:text-orange-600 mx-auto mb-2" />
                        <p className="text-[13px] text-orange-300 dark:text-orange-700 font-medium">
                          Please hand over the exact cash amount directly to your warden. They will verify and approve this payment manually.
                        </p>
                      </div>
                    )}

                    <div>
                      <input
                        type="number" required min="1" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)}
                        className="w-full h-14 px-5 bg-white dark:bg-white rounded-full text-[16px] font-bold text-black placeholder:text-gray-400 focus:outline-none shadow-inner transition-all"
                        placeholder="Amount (?)"
                      />
                    </div>
                    
                    <PillButton 
                      type="submit" 
                      disabled={uploading || (paymentMode === "UPI" && !uploadFile)} 
                      className="bg-white dark:bg-black text-black dark:text-white mt-2 w-full"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Payment Details"}
                    </PillButton>
                  </form>
                </div>
              )}
            </SoftCard>
`;

  fs.writeFileSync("app/tenant/page.tsx", prefix + replacementContent + suffix);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start/end.");
}

