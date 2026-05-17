package com.embroiderytech.chainwayrfid

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.rscja.deviceapi.RFIDWithUHFUART
import com.rscja.deviceapi.entity.UHFTAGInfo
import com.rscja.deviceapi.interfaces.IUHFInventoryCallback
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class ChainwayRfidModule : Module() {
  private var reader: RFIDWithUHFUART? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  private var receiverRegistered = false
  private var receiverEnabled = true
  private var observing = false
  private var jsObserverActive = false
  private val moduleCreatedAt = System.currentTimeMillis()
  private var lastLifecycleEvent = "constructed"
  private var registerAttempts = 0
  private var registerFailures = 0
  private var lastRegisterFailure: String? = null
  private var lastReceiverRegisteredAt: Long? = null
  private var lastReceiverUnregisteredAt: Long? = null
  private var listenerStartCount = 0
  private var listenerStopCount = 0
  private var explicitStartCount = 0
  private var explicitStopCount = 0
  private var inventoryStartCount = 0
  private var inventoryStopCount = 0
  private var fallbackInventoryStartCount = 0
  private var fallbackInventoryStopCount = 0
  private var inventoryCommandFailureCount = 0
  private var lastInventoryCommand: String? = null
  private var lastInventoryCommandAt: Long? = null
  private var lastInventoryCommandFailure: String? = null
  private var inventoryActiveRequested = false
  private var isInventoryActive = false
  private var lastInventoryStartRequestedAt: Long? = null
  private var lastInventoryStopRequestedAt: Long? = null
  private var lastStartInventoryReturnValue: Boolean? = null
  private var lastStopInventoryReturnValue: Boolean? = null
  private var readerInitAttemptCount = 0
  private var readerInitSuccessCount = 0
  private var readerInitFailureCount = 0
  private var readerInitialized = false
  private var readerCallbackSet = false
  private var lastReaderInitAt: Long? = null
  private var lastReaderInitFailure: String? = null
  private var lastReaderInitReturnValue: Boolean? = null
  private var lastReaderCallbackSetAt: Long? = null
  private var sdkCallbackCount = 0
  private var invalidSdkCallbackCount = 0
  private var lastSdkCallbackAt: Long? = null
  private var lastSdkRawTagObject: String? = null
  private var sdkSilentFailureDetected = false
  private var systemControlledRfidSuspected = false
  private var lastSystemControlWarningAt: Long? = null
  private var lastSilentFailureWarningAt: Long? = null
  private var inventorySessionId = 0
  private var epcAfterInventoryStartCount = 0
  private var epcWithoutLocalStartCount = 0
  private var lastEpcWithoutLocalStartAt: Long? = null
  private var deviceControlConflictDetected = false
  private var broadcastCount = 0
  private var invalidBroadcastCount = 0
  private var emittedEventCount = 0
  private var droppedEventCount = 0
  private var lastBroadcastAt: Long? = null
  private var lastRawData: String? = null
  private var lastEpc: String? = null
  private var lastTid: String? = null
  private var lastEpcAt: Long? = null
  private var lastEpcTimestamp: Long = 0
  private var lastEmittedAt: Long? = null

  private val inventoryCallback = object : IUHFInventoryCallback {
    override fun callback(tagInfo: UHFTAGInfo?) {
      handleSdkInventoryCallback(tagInfo)
    }
  }

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action != RFID_ACTION) {
        Log.d(TAG, "Ignoring broadcast with unexpected action=${intent?.action}")
        return
      }

      broadcastCount += 1
      lastBroadcastAt = System.currentTimeMillis()
      handleIncomingEpc(intent.getStringExtra(RFID_EXTRA_KEY), null, "broadcast")
    }
  }

  override fun definition() = ModuleDefinition {
    Name(MODULE_NAME)

    Events(RFID_TAG_SCANNED_EVENT)

    Constants(
      "rfidAction" to RFID_ACTION,
      "rfidExtraKey" to RFID_EXTRA_KEY,
      "moduleVersion" to MODULE_VERSION,
      "nativeBuildId" to NATIVE_BUILD_ID,
      "inventoryController" to INVENTORY_CONTROLLER,
      "deviceApiClass" to DEVICE_API_CLASS
    )

    OnCreate {
      lastLifecycleEvent = "onCreate"
      Log.i(TAG, "Module created version=$MODULE_VERSION buildId=$NATIVE_BUILD_ID controller=$INVENTORY_CONTROLLER")
      registerReceiver("onCreate")
    }

    Function("isListening") {
      receiverRegistered
    }

    Function("isReceiverRegistered") {
      receiverRegistered
    }

    Function("getDiagnostics") {
      getDiagnostics()
    }

    AsyncFunction("startInventory") {
      startSdkInventory("startInventory", false)
    }

    AsyncFunction("startInventoryFallback") {
      startSdkInventory("startInventoryFallback", true)
    }

    AsyncFunction("stopInventory") {
      stopSdkInventory("stopInventory", false)
    }

    AsyncFunction("stopInventoryFallback") {
      stopSdkInventory("stopInventoryFallback", true)
    }

    AsyncFunction("startListening") {
      explicitStartCount += 1
      observing = true
      receiverEnabled = true
      lastLifecycleEvent = "startListening"
      Log.i(TAG, "startListening requested explicitStartCount=$explicitStartCount")
      registerReceiver("startListening")
      getDiagnostics()
    }

    AsyncFunction("stopListening") {
      explicitStopCount += 1
      observing = false
      receiverEnabled = false
      lastLifecycleEvent = "stopListening"
      Log.i(TAG, "stopListening requested explicitStopCount=$explicitStopCount")
      unregisterReceiver("stopListening")
      getDiagnostics()
    }

    OnStartObserving(RFID_TAG_SCANNED_EVENT) {
      listenerStartCount += 1
      observing = true
      jsObserverActive = true
      receiverEnabled = true
      lastLifecycleEvent = "onStartObserving"
      Log.i(TAG, "JS listener attached listenerStartCount=$listenerStartCount")
      registerReceiver("onStartObserving")
    }

    OnStopObserving(RFID_TAG_SCANNED_EVENT) {
      listenerStopCount += 1
      observing = false
      jsObserverActive = false
      lastLifecycleEvent = "onStopObserving"
      Log.i(TAG, "JS listener detached listenerStopCount=$listenerStopCount receiverRegistered=$receiverRegistered")
    }

    OnActivityEntersForeground {
      lastLifecycleEvent = "activityForeground"
      if (receiverEnabled) {
        registerReceiver("activityForeground")
      } else {
        Log.i(TAG, "Foreground entered while receiver is explicitly disabled")
      }
    }

    OnActivityEntersBackground {
      lastLifecycleEvent = "activityBackground"
      stopInventoryIfActive("activityBackground")
      unregisterReceiver("activityBackground")
    }

    OnDestroy {
      lastLifecycleEvent = "onDestroy"
      stopInventoryIfActive("onDestroy")
      unregisterReceiver("onDestroy")
      freeReader("onDestroy")
    }
  }

  private fun startSdkInventory(reason: String, fallback: Boolean): Map<String, Any?> {
    val requestedAt = System.currentTimeMillis()
    receiverEnabled = true
    registerReceiver(reason)

    Log.i(TAG, "Preparing DeviceAPI inventory start reason=$reason fallback=$fallback")

    return try {
      val sdkReader = ensureReaderInitialized(reason)
      val alreadyInventorying = isReaderInventorying(sdkReader)
      val startSkipped = alreadyInventorying == true
      val callbackBaseline = sdkCallbackCount
      val sessionId = inventorySessionId + 1
      val startReturnValue =
        if (startSkipped) {
          Log.i(TAG, "DeviceAPI startInventoryTag skipped because reader is already inventorying reason=$reason")
          Log.d(DIAGNOSTIC_TAG, "INVENTORY START RESULT = true")
          true
        } else {
          val started = sdkReader.startInventoryTag()
          Log.d(DIAGNOSTIC_TAG, "INVENTORY START RESULT = $started")
          started
        }

      lastStartInventoryReturnValue = startReturnValue
      lastInventoryCommand = DEVICE_API_START_OPERATION
      lastInventoryCommandAt = requestedAt
      val startFailure =
        if (startReturnValue) {
          null
        } else {
          "$DEVICE_API_START_OPERATION returned false"
        }
      lastInventoryCommandFailure = startFailure
      if (startFailure != null) {
        inventoryCommandFailureCount += 1
      }

      if (fallback) {
        fallbackInventoryStartCount += 1
      } else {
        inventoryStartCount += 1
      }

      if (startReturnValue) {
        inventorySessionId = sessionId
        inventoryActiveRequested = true
        isInventoryActive = true
        lastInventoryStartRequestedAt = requestedAt
        epcAfterInventoryStartCount = 0
        deviceControlConflictDetected = false
        sdkSilentFailureDetected = false
        scheduleSdkSilentFailureCheck(sessionId, callbackBaseline, requestedAt, reason)
      } else {
        isInventoryActive = false
        markSystemControlledRfidSuspected("SDK inventory start failed reason=$reason")
      }

      Log.i(
        TAG,
        "DeviceAPI startInventoryTag completed reason=$reason fallback=$fallback returnValue=$startReturnValue alreadyInventorying=$alreadyInventorying"
      )
      if (startFailure != null) {
        Log.w(TAG, "DeviceAPI inventory start reported failure reason=$reason failure=$startFailure")
      }

      buildDeviceApiCommandResult(
        operation = DEVICE_API_START_OPERATION,
        reason = reason,
        timestamp = requestedAt,
        returnValue = startReturnValue,
        alreadyInventorying = alreadyInventorying,
        skipped = startSkipped,
        failure = startFailure
      )
    } catch (error: Exception) {
      recordInventoryCommandFailure(reason, DEVICE_API_START_OPERATION, error)
      markSystemControlledRfidSuspected("SDK inventory start exception reason=$reason failure=${error.message}")
      isInventoryActive = false

      buildDeviceApiCommandResult(
        operation = DEVICE_API_START_OPERATION,
        reason = reason,
        timestamp = requestedAt,
        returnValue = false,
        alreadyInventorying = null,
        skipped = false,
        failure = lastInventoryCommandFailure
      )
    }
  }

  private fun stopSdkInventory(reason: String, fallback: Boolean): Map<String, Any?> {
    val requestedAt = System.currentTimeMillis()
    val sdkReader = reader

    Log.i(TAG, "Preparing DeviceAPI inventory stop reason=$reason fallback=$fallback readerAvailable=${sdkReader != null}")

    if (sdkReader == null || !readerInitialized) {
      inventoryActiveRequested = false
      isInventoryActive = false
      lastInventoryStopRequestedAt = requestedAt
      lastInventoryCommand = DEVICE_API_STOP_OPERATION
      lastInventoryCommandAt = requestedAt
      Log.i(TAG, "DeviceAPI stopInventory skipped because reader is not initialized reason=$reason")

      return buildDeviceApiCommandResult(
        operation = DEVICE_API_STOP_OPERATION,
        reason = reason,
        timestamp = requestedAt,
        returnValue = null,
        alreadyInventorying = null,
        skipped = true,
        failure = null
      )
    }

    return try {
      val alreadyInventorying = isReaderInventorying(sdkReader)
      val stopSkipped = !inventoryActiveRequested && alreadyInventorying != true
      val stopReturnValue =
        if (stopSkipped) {
          Log.i(TAG, "DeviceAPI stopInventory skipped because inventory is already inactive reason=$reason")
          Log.d(DIAGNOSTIC_TAG, "INVENTORY STOP RESULT = true")
          true
        } else {
          val stopped = sdkReader.stopInventory()
          Log.d(DIAGNOSTIC_TAG, "INVENTORY STOP RESULT = $stopped")
          stopped
        }

      lastStopInventoryReturnValue = stopReturnValue
      lastInventoryCommand = DEVICE_API_STOP_OPERATION
      lastInventoryCommandAt = requestedAt
      val stopFailure =
        if (stopReturnValue) {
          null
        } else {
          "$DEVICE_API_STOP_OPERATION returned false"
        }
      lastInventoryCommandFailure = stopFailure
      if (stopFailure != null) {
        inventoryCommandFailureCount += 1
      }
      lastInventoryStopRequestedAt = requestedAt

      if (fallback) {
        fallbackInventoryStopCount += 1
      } else {
        inventoryStopCount += 1
      }

      if (stopReturnValue) {
        inventoryActiveRequested = false
        isInventoryActive = false
      }

      Log.i(
        TAG,
        "DeviceAPI stopInventory completed reason=$reason fallback=$fallback returnValue=$stopReturnValue wasInventorying=$alreadyInventorying"
      )
      if (stopFailure != null) {
        Log.w(TAG, "DeviceAPI inventory stop reported failure reason=$reason failure=$stopFailure")
        markSystemControlledRfidSuspected("SDK inventory stop failed reason=$reason")
      }

      buildDeviceApiCommandResult(
        operation = DEVICE_API_STOP_OPERATION,
        reason = reason,
        timestamp = requestedAt,
        returnValue = stopReturnValue,
        alreadyInventorying = alreadyInventorying,
        skipped = stopSkipped,
        failure = stopFailure
      )
    } catch (error: Exception) {
      recordInventoryCommandFailure(reason, DEVICE_API_STOP_OPERATION, error)
      buildDeviceApiCommandResult(
        operation = DEVICE_API_STOP_OPERATION,
        reason = reason,
        timestamp = requestedAt,
        returnValue = false,
        alreadyInventorying = null,
        skipped = false,
        failure = lastInventoryCommandFailure
      )
    }
  }

  @Synchronized
  private fun ensureReaderInitialized(reason: String): RFIDWithUHFUART {
    val currentReader = reader
    if (currentReader != null && readerInitialized) {
      ensureInventoryCallback(currentReader, reason)
      return currentReader
    }

    val activity = appContext.currentActivity
      ?: throw IllegalStateException("Current Activity is not available for Chainway DeviceAPI init")

    if (activity.isFinishing || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && activity.isDestroyed)) {
      throw IllegalStateException("Current Activity is not usable for Chainway DeviceAPI init")
    }

    readerInitAttemptCount += 1
    lastReaderInitAt = System.currentTimeMillis()

    try {
      val initReturnValue = initRfid(activity)
      readerInitialized = initReturnValue
      lastReaderInitReturnValue = initReturnValue

      val sdkReader = reader
      if (sdkReader == null) {
        readerInitFailureCount += 1
        lastReaderInitFailure = "RFIDWithUHFUART.getInstance() returned null"
        Log.e(TAG, "DeviceAPI reader init failed reason=$reason reader=null")
        markSystemControlledRfidSuspected("RFIDWithUHFUART.getInstance returned null reason=$reason")
        throw IllegalStateException(lastReaderInitFailure ?: "Chainway DeviceAPI reader unavailable")
      }

      if (!initReturnValue) {
        readerInitFailureCount += 1
        lastReaderInitFailure = "RFIDWithUHFUART.init(activity) returned false"
        Log.e(TAG, "DeviceAPI reader init failed reason=$reason returnValue=false")
        markSystemControlledRfidSuspected("RFIDWithUHFUART.init returned false reason=$reason")
        throw IllegalStateException(lastReaderInitFailure ?: "Chainway DeviceAPI reader init failed")
      }

      readerInitSuccessCount += 1
      lastReaderInitFailure = null
      ensureInventoryCallback(sdkReader, reason)
      Log.i(TAG, "DeviceAPI reader init succeeded reason=$reason attempts=$readerInitAttemptCount")
      return sdkReader
    } catch (error: Exception) {
      readerInitialized = false
      readerCallbackSet = false
      if (lastReaderInitFailure == null) {
        readerInitFailureCount += 1
        lastReaderInitFailure = "${error.javaClass.simpleName}: ${error.message}"
      }
      Log.e(TAG, "DeviceAPI reader init failed reason=$reason failure=$lastReaderInitFailure", error)
      throw error
    }
  }

  private fun initRfid(activity: Activity): Boolean {
    Log.d(DIAGNOSTIC_TAG, "=== RFID INIT START ===")
    readerCallbackSet = false
    reader = RFIDWithUHFUART.getInstance()
    val result = reader?.init(activity) ?: false
    Log.d(DIAGNOSTIC_TAG, "RFID INIT RESULT = $result")
    if (!result) {
      Log.e(DIAGNOSTIC_TAG, "RFID INIT FAILED - SDK cannot access hardware")
    }
    return result
  }

  private fun ensureInventoryCallback(sdkReader: RFIDWithUHFUART, reason: String) {
    if (readerCallbackSet) {
      return
    }

    sdkReader.setInventoryCallback(inventoryCallback)
    readerCallbackSet = true
    lastReaderCallbackSetAt = System.currentTimeMillis()
    Log.i(TAG, "DeviceAPI inventory callback set reason=$reason")
  }

  private fun handleSdkInventoryCallback(tagInfo: UHFTAGInfo?) {
    val rawEpc = tagInfo?.getEPC()
    val rawTid = tagInfo?.getTid()
    val rawTagObject = tagInfo?.toString()
    lastSdkRawTagObject = rawTagObject

    Log.d(DIAGNOSTIC_TAG, "TAG RAW OBJECT = $rawTagObject")
    Log.d(DIAGNOSTIC_TAG, "EPC RECEIVED = $rawEpc | TID = $rawTid")
    Log.i(TAG, "DeviceAPI inventory callback fired rawEpcAvailable=${!rawEpc.isNullOrBlank()}")

    mainHandler.post {
      sdkCallbackCount += 1
      lastSdkCallbackAt = System.currentTimeMillis()
      handleIncomingEpc(rawEpc, rawTid, "deviceApiCallback")
    }
  }

  private fun handleIncomingEpc(rawData: String?, rawTid: String?, source: String) {
    lastRawData = rawData

    val epc = normalizeEpc(rawData)
    if (epc == null) {
      if (source == "broadcast") {
        invalidBroadcastCount += 1
      } else {
        invalidSdkCallbackCount += 1
      }

      Log.w(TAG, "RFID $source received without a valid EPC")
      return
    }

    val receivedAt = System.currentTimeMillis()
    val stopAt = lastInventoryStopRequestedAt
    val withinLocalStopGracePeriod =
      stopAt != null && receivedAt - stopAt <= LOCAL_STOP_EPC_GRACE_MS

    lastEpc = epc
    lastTid = normalizeTid(rawTid)
    lastEpcAt = receivedAt
    lastEpcTimestamp = receivedAt

    if (inventoryActiveRequested || withinLocalStopGracePeriod) {
      epcAfterInventoryStartCount += 1
    } else {
      epcWithoutLocalStartCount += 1
      lastEpcWithoutLocalStartAt = receivedAt

      if (epcWithoutLocalStartCount >= EXTERNAL_CONTROL_WARNING_THRESHOLD) {
        deviceControlConflictDetected = true
        Log.w(
          TAG,
          "RFID EPC received without local inventory start. Possible external controller epc=$epc count=$epcWithoutLocalStartCount"
        )
      }
    }

    Log.i(
      TAG,
      "RFID EPC received source=$source epc=$epc tid=$lastTid broadcastCount=$broadcastCount sdkCallbackCount=$sdkCallbackCount"
    )
    emitTag(epc, lastTid)
  }

  private fun scheduleSdkSilentFailureCheck(
    sessionId: Int,
    callbackBaseline: Int,
    startedAt: Long,
    reason: String
  ) {
    mainHandler.postDelayed({
      val callbackReceivedForSession =
        sdkCallbackCount > callbackBaseline &&
          lastSdkCallbackAt != null &&
          lastSdkCallbackAt!! >= startedAt

      if (
        inventorySessionId == sessionId &&
        isInventoryActive &&
        lastStartInventoryReturnValue == true &&
        !callbackReceivedForSession
      ) {
        sdkSilentFailureDetected = true
        lastSilentFailureWarningAt = System.currentTimeMillis()
        Log.w(DIAGNOSTIC_TAG, "NO EPC CALLBACK RECEIVED - POSSIBLE APP-CENTER CONTROLLED RFID")
        markSystemControlledRfidSuspected("No DeviceAPI callback within ${SDK_CALLBACK_WATCHDOG_MS}ms reason=$reason")
      }
    }, SDK_CALLBACK_WATCHDOG_MS)
  }

  private fun markSystemControlledRfidSuspected(reason: String) {
    systemControlledRfidSuspected = true
    lastSystemControlWarningAt = System.currentTimeMillis()
    Log.e(DIAGNOSTIC_TAG, "DEVICE MAY BE LOCKED TO APPCENTER RFID SERVICE")
    Log.e(TAG, "DeviceAPI hardware access warning reason=$reason")
  }

  private fun getRfidControlMode(): String {
    return when {
      systemControlledRfidSuspected -> "system-controlled-suspected"
      sdkCallbackCount > 0 -> "sdk-controlled"
      lastReaderInitReturnValue == false -> "sdk-init-failed"
      lastStartInventoryReturnValue == false -> "sdk-start-failed"
      readerInitialized && isInventoryActive -> "sdk-started-awaiting-callback"
      readerInitialized -> "sdk-initialized"
      else -> "unknown"
    }
  }

  private fun buildDeviceApiCommandResult(
    operation: String,
    reason: String,
    timestamp: Long,
    returnValue: Boolean?,
    alreadyInventorying: Boolean?,
    skipped: Boolean,
    failure: String?
  ): Map<String, Any?> {
    return mapOf(
      "sent" to (returnValue == true && !skipped),
      "action" to operation,
      "timestamp" to timestamp,
      "reason" to reason,
      "receiverRegistered" to receiverRegistered,
      "failure" to failure,
      "deviceApiClass" to DEVICE_API_CLASS,
      "inventoryController" to INVENTORY_CONTROLLER,
      "deviceApiReturnValue" to returnValue,
      "alreadyInventorying" to alreadyInventorying,
      "skipped" to skipped,
      "readerAvailable" to (reader != null),
      "readerInitialized" to readerInitialized,
      "readerCallbackSet" to readerCallbackSet,
      "isInventoryActive" to isInventoryActive,
      "lastEpcTimestamp" to lastEpcTimestamp,
      "sdkSilentFailureDetected" to sdkSilentFailureDetected,
      "systemControlledRfidSuspected" to systemControlledRfidSuspected,
      "lastSystemControlWarningAt" to lastSystemControlWarningAt,
      "rfidControlMode" to getRfidControlMode(),
      "reactContextAvailable" to (appContext.reactContext != null),
      "applicationContextAvailable" to (appContext.reactContext?.applicationContext != null)
    )
  }

  private fun recordInventoryCommandFailure(reason: String, operation: String, error: Exception) {
    inventoryCommandFailureCount += 1
    lastInventoryCommand = operation
    lastInventoryCommandAt = System.currentTimeMillis()
    lastInventoryCommandFailure = "${error.javaClass.simpleName}: ${error.message}"
    Log.e(TAG, "DeviceAPI inventory command failed reason=$reason operation=$operation failure=$lastInventoryCommandFailure", error)
  }

  private fun isReaderInventorying(sdkReader: RFIDWithUHFUART? = reader): Boolean? {
    if (sdkReader == null || !readerInitialized) {
      return null
    }

    return try {
      sdkReader.isInventorying()
    } catch (error: Exception) {
      Log.w(TAG, "Unable to read DeviceAPI inventory state: ${error.message}")
      null
    }
  }

  private fun stopInventoryIfActive(reason: String) {
    val sdkInventorying = isReaderInventorying()
    if (!inventoryActiveRequested && sdkInventorying != true) {
      return
    }

    try {
      stopSdkInventory(reason, false)
    } catch (error: Exception) {
      Log.w(TAG, "DeviceAPI stop failed during lifecycle reason=$reason failure=${error.message}")
    }
  }

  private fun freeReader(reason: String) {
    val sdkReader = reader ?: return

    try {
      val freeReturnValue = sdkReader.free()
      Log.i(TAG, "DeviceAPI reader free completed reason=$reason returnValue=$freeReturnValue")
    } catch (error: Exception) {
      Log.w(TAG, "DeviceAPI reader free failed reason=$reason failure=${error.message}")
    } finally {
      reader = null
      readerInitialized = false
      readerCallbackSet = false
      inventoryActiveRequested = false
      isInventoryActive = false
    }
  }

  private fun registerReceiver(reason: String) {
    registerAttempts += 1

    if (!receiverEnabled) {
      Log.i(TAG, "Receiver registration skipped because receiverEnabled=false reason=$reason")
      return
    }

    val context = appContext.reactContext?.applicationContext
    if (context == null) {
      registerFailures += 1
      lastRegisterFailure = "React application context is not available"
      Log.w(TAG, "Cannot register receiver yet reason=$reason failure=$lastRegisterFailure")
      return
    }

    if (receiverRegistered) {
      Log.d(TAG, "Receiver already registered reason=$reason")
      return
    }

    val intentFilter = IntentFilter(RFID_ACTION)

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(receiver, intentFilter, Context.RECEIVER_EXPORTED)
      } else {
        context.registerReceiver(receiver, intentFilter)
      }

      receiverRegistered = true
      lastReceiverRegisteredAt = System.currentTimeMillis()
      lastRegisterFailure = null
      Log.i(TAG, "Receiver registered reason=$reason action=$RFID_ACTION sdk=${Build.VERSION.SDK_INT}")
    } catch (error: Exception) {
      registerFailures += 1
      lastRegisterFailure = "${error.javaClass.simpleName}: ${error.message}"
      Log.e(TAG, "Receiver registration failed reason=$reason failure=$lastRegisterFailure", error)
    }
  }

  private fun unregisterReceiver(reason: String) {
    val context = appContext.reactContext?.applicationContext
    if (context == null) {
      Log.w(TAG, "Cannot unregister receiver because context is unavailable reason=$reason")
      receiverRegistered = false
      return
    }

    if (!receiverRegistered) {
      Log.d(TAG, "Receiver already unregistered reason=$reason")
      return
    }

    try {
      context.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // Receiver may already be detached if Android destroyed the hosting context first.
    } finally {
      receiverRegistered = false
      lastReceiverUnregisteredAt = System.currentTimeMillis()
      Log.i(TAG, "Receiver unregistered reason=$reason")
    }
  }

  private fun emitTag(epc: String, tid: String? = null) {
    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainHandler.post { emitTag(epc, tid) }
      return
    }

    if (!appContext.hasActiveReactInstance) {
      droppedEventCount += 1
      Log.w(TAG, "Dropping EPC event because React instance is inactive epc=$epc")
      return
    }

    sendEvent(
      RFID_TAG_SCANNED_EVENT,
      mapOf(
        "epc" to epc,
        "tid" to tid,
        "timestamp" to System.currentTimeMillis()
      )
    )

    emittedEventCount += 1
    lastEmittedAt = System.currentTimeMillis()
    Log.i(TAG, "RFID event emitted epc=$epc tid=$tid emittedEventCount=$emittedEventCount")
  }

  private fun normalizeEpc(value: String?): String? {
    val normalized = value
      ?.trim()
      ?.uppercase(Locale.US)
      ?.replace(Regex("[^A-Z0-9]"), "")

    return normalized?.takeIf { it.isNotEmpty() }
  }

  private fun normalizeTid(value: String?): String? {
    val normalized = value
      ?.trim()
      ?.uppercase(Locale.US)
      ?.replace(Regex("[^A-Z0-9]"), "")

    return normalized?.takeIf { it.isNotEmpty() }
  }

  private fun getDiagnostics(): Map<String, Any?> {
    return mapOf(
      "moduleName" to MODULE_NAME,
      "moduleVersion" to MODULE_VERSION,
      "nativeBuildId" to NATIVE_BUILD_ID,
      "rfidAction" to RFID_ACTION,
      "rfidExtraKey" to RFID_EXTRA_KEY,
      "inventoryController" to INVENTORY_CONTROLLER,
      "deviceApiClass" to DEVICE_API_CLASS,
      "receiverEnabled" to receiverEnabled,
      "receiverRegistered" to receiverRegistered,
      "observing" to observing,
      "jsObserverActive" to jsObserverActive,
      "hasActiveReactInstance" to appContext.hasActiveReactInstance,
      "applicationContextAvailable" to (appContext.reactContext?.applicationContext != null),
      "currentActivityAvailable" to (appContext.currentActivity != null),
      "androidSdk" to Build.VERSION.SDK_INT,
      "moduleCreatedAt" to moduleCreatedAt,
      "lastLifecycleEvent" to lastLifecycleEvent,
      "registerAttempts" to registerAttempts,
      "registerFailures" to registerFailures,
      "lastRegisterFailure" to lastRegisterFailure,
      "lastReceiverRegisteredAt" to lastReceiverRegisteredAt,
      "lastReceiverUnregisteredAt" to lastReceiverUnregisteredAt,
      "listenerStartCount" to listenerStartCount,
      "listenerStopCount" to listenerStopCount,
      "explicitStartCount" to explicitStartCount,
      "explicitStopCount" to explicitStopCount,
      "inventoryStartCount" to inventoryStartCount,
      "inventoryStopCount" to inventoryStopCount,
      "fallbackInventoryStartCount" to fallbackInventoryStartCount,
      "fallbackInventoryStopCount" to fallbackInventoryStopCount,
      "inventoryCommandFailureCount" to inventoryCommandFailureCount,
      "lastInventoryCommand" to lastInventoryCommand,
      "lastInventoryCommandAt" to lastInventoryCommandAt,
      "lastInventoryCommandFailure" to lastInventoryCommandFailure,
      "inventoryActiveRequested" to inventoryActiveRequested,
      "isInventoryActive" to isInventoryActive,
      "lastInventoryStartRequestedAt" to lastInventoryStartRequestedAt,
      "lastInventoryStopRequestedAt" to lastInventoryStopRequestedAt,
      "lastStartInventoryReturnValue" to lastStartInventoryReturnValue,
      "lastStopInventoryReturnValue" to lastStopInventoryReturnValue,
      "readerAvailable" to (reader != null),
      "readerInitialized" to readerInitialized,
      "readerCallbackSet" to readerCallbackSet,
      "readerInitAttemptCount" to readerInitAttemptCount,
      "readerInitSuccessCount" to readerInitSuccessCount,
      "readerInitFailureCount" to readerInitFailureCount,
      "lastReaderInitAt" to lastReaderInitAt,
      "lastReaderInitFailure" to lastReaderInitFailure,
      "lastReaderInitReturnValue" to lastReaderInitReturnValue,
      "lastReaderCallbackSetAt" to lastReaderCallbackSetAt,
      "deviceApiIsInventorying" to isReaderInventorying(),
      "sdkCallbackCount" to sdkCallbackCount,
      "invalidSdkCallbackCount" to invalidSdkCallbackCount,
      "lastSdkCallbackAt" to lastSdkCallbackAt,
      "lastSdkRawTagObject" to lastSdkRawTagObject,
      "sdkSilentFailureDetected" to sdkSilentFailureDetected,
      "systemControlledRfidSuspected" to systemControlledRfidSuspected,
      "lastSystemControlWarningAt" to lastSystemControlWarningAt,
      "lastSilentFailureWarningAt" to lastSilentFailureWarningAt,
      "inventorySessionId" to inventorySessionId,
      "rfidControlMode" to getRfidControlMode(),
      "epcAfterInventoryStartCount" to epcAfterInventoryStartCount,
      "epcWithoutLocalStartCount" to epcWithoutLocalStartCount,
      "lastEpcWithoutLocalStartAt" to lastEpcWithoutLocalStartAt,
      "deviceControlConflictDetected" to deviceControlConflictDetected,
      "deviceControlConflictWarning" to getDeviceControlConflictWarning(),
      "broadcastCount" to broadcastCount,
      "invalidBroadcastCount" to invalidBroadcastCount,
      "emittedEventCount" to emittedEventCount,
      "droppedEventCount" to droppedEventCount,
      "lastBroadcastAt" to lastBroadcastAt,
      "lastRawData" to lastRawData,
      "lastEpc" to lastEpc,
      "lastTid" to lastTid,
      "lastEpcAt" to lastEpcAt,
      "lastEpcTimestamp" to lastEpcTimestamp,
      "lastEmittedAt" to lastEmittedAt
    )
  }

  private fun getDeviceControlConflictWarning(): Map<String, Any?>? {
    if (!deviceControlConflictDetected) {
      return null
    }

    return mapOf(
      "warning" to "RFID engine already active outside this app",
      "likelySource" to "external scanner service or another app",
      "epcWithoutLocalStartCount" to epcWithoutLocalStartCount,
      "lastEpcWithoutLocalStartAt" to lastEpcWithoutLocalStartAt
    )
  }

  companion object {
    private const val TAG = "ChainwayRfid"
    private const val DIAGNOSTIC_TAG = "RFID"
    private const val MODULE_NAME = "ChainwayRfid"
    private const val MODULE_VERSION = "3.2.0"
    private const val NATIVE_BUILD_ID = "chainway-rfid-native-7-diagnostics"
    private const val RFID_ACTION = "com.rscja.scanner.action.scanner.RFID"
    private const val RFID_EXTRA_KEY = "data"
    private const val INVENTORY_CONTROLLER = "Chainway DeviceAPI"
    private const val DEVICE_API_CLASS = "com.rscja.deviceapi.RFIDWithUHFUART"
    private const val DEVICE_API_START_OPERATION = "DeviceAPI.startInventoryTag"
    private const val DEVICE_API_STOP_OPERATION = "DeviceAPI.stopInventory"
    private const val EXTERNAL_CONTROL_WARNING_THRESHOLD = 2
    private const val LOCAL_STOP_EPC_GRACE_MS = 1000
    private const val SDK_CALLBACK_WATCHDOG_MS = 5000L
    private const val RFID_TAG_SCANNED_EVENT = "rfidTagScanned"
  }
}
